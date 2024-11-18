// app/api/send-emails/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication } from '@azure/msal-node';
import 'isomorphic-fetch';

interface EmailRecipient {
    email: string;
    first_name: string;
    last_name: string;
    company: string;
    role: string;
    custom_message: string;
    [key: string]: string;
}

interface SendEmailRequest {
    subject: string;
    emailBody: string;
    recipients: EmailRecipient[];
}

interface GraphError {
    code?: string;
    message?: string;
    innerError?: {
        code?: string;
        message?: string;
        date?: string;
        requestId?: string;
        clientRequestId?: string;
    };
}

const msalConfig = {
    auth: {
        clientId: process.env.AZURE_CLIENT_ID!,
        clientSecret: process.env.AZURE_CLIENT_SECRET!,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`
    }
};

function parseGraphError(error: any): string {
    if (typeof error === 'string') return error;

    const graphError = error?.error as GraphError;
    if (!graphError) return 'Unknown error occurred';

    const details = [
        graphError.message,
        graphError.innerError?.message,
        `Code: ${graphError.code || graphError.innerError?.code}`,
        graphError.innerError?.requestId && `Request ID: ${graphError.innerError.requestId}`
    ].filter(Boolean).join(' | ');

    return details || 'Unknown Graph API error';
}

async function getGraphClient() {
    try {
        console.log('Initializing MSAL client...');
        const cca = new ConfidentialClientApplication(msalConfig);

        console.log('Acquiring token...');
        const result = await cca.acquireTokenByClientCredential({
            scopes: ['https://graph.microsoft.com/.default']
        });

        if (!result?.accessToken) {
            console.error('No access token received from MSAL');
            throw new Error('Failed to get access token');
        }

        console.log('Token acquired successfully');
        return Client.init({
            authProvider: (done) => {
                done(null, result.accessToken);
            }
        });
    } catch (error) {
        console.error('Error in getGraphClient:', error);
        throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

function replaceTemplateVariables(template: string, data: Record<string, string>): string {
    return template.replace(/\${(\w+)}/g, (match, key) => data[key] || match);
}

export async function POST(req: NextRequest) {
    try {
        console.log('Starting email sending process...');

        // Validate environment variables
        if (!process.env.AZURE_CLIENT_ID || !process.env.AZURE_CLIENT_SECRET || !process.env.AZURE_TENANT_ID) {
            throw new Error('Missing required environment variables');
        }

        const { subject, emailBody, recipients }: SendEmailRequest = await req.json();

        // Validate request data
        if (!subject || !emailBody || !recipients?.length) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        console.log(`Preparing to send ${recipients.length} emails`);
        const client = await getGraphClient();

        const results = {
            successful: [] as string[],
            failed: [] as { email: string; error: string }[],
            metadata: {
                totalAttempted: recipients.length,
                startTime: new Date().toISOString(),
            }
        };

        for (const recipient of recipients) {
            try {
                console.log(`Processing email for ${recipient.email}`);
                const personalizedSubject = replaceTemplateVariables(subject, recipient);
                const personalizedBody = replaceTemplateVariables(emailBody, recipient);

                await client.api('/me/sendMail').post({
                    message: {
                        subject: personalizedSubject,
                        body: {
                            contentType: 'HTML',
                            content: personalizedBody
                        },
                        toRecipients: [
                            {
                                emailAddress: {
                                    address: recipient.email
                                }
                            }
                        ]
                    },
                    saveToSentItems: true
                });

                console.log(`Successfully sent email to ${recipient.email}`);
                results.successful.push(recipient.email);

                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Failed to send email to ${recipient.email}:`, error);
                const errorMessage = parseGraphError(error);
                results.failed.push({
                    email: recipient.email,
                    error: errorMessage
                });
            }
        }

        console.log('Email sending process completed', results);

        return NextResponse.json({
            success: true,
            results,
            summary: {
                total: recipients.length,
                successful: results.successful.length,
                failed: results.failed.length
            }
        });

    } catch (error) {
        console.error('Critical error in email sending process:', error);

        // Determine if it's an authentication error
        const isAuthError = error instanceof Error &&
            (error.message.includes('token') || error.message.includes('auth'));

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                errorType: isAuthError ? 'authentication' : 'general',
                timestamp: new Date().toISOString()
            },
            { status: isAuthError ? 401 : 500 }
        );
    }
}