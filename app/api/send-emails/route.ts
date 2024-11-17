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

const msalConfig = {
    auth: {
        clientId: process.env.AZURE_CLIENT_ID!,
        clientSecret: process.env.AZURE_CLIENT_SECRET!,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`
    }
};

async function getGraphClient() {
    const cca = new ConfidentialClientApplication(msalConfig);

    const result = await cca.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default']
    });

    if (!result?.accessToken) {
        throw new Error('Failed to get access token');
    }

    return Client.init({
        authProvider: (done) => {
            done(null, result.accessToken);
        }
    });
}

function replaceTemplateVariables(template: string, data: Record<string, string>): string {
    return template.replace(/\${(\w+)}/g, (match, key) => data[key] || match);
}

export async function POST(req: NextRequest) {
    try {
        const { subject, emailBody, recipients }: SendEmailRequest = await req.json();
        const client = await getGraphClient();

        const results = {
            successful: [] as string[],
            failed: [] as { email: string; error: string }[]
        };

        for (const recipient of recipients) {
            try {
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

                results.successful.push(recipient.email);

                // Add delay between emails
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                results.failed.push({
                    email: recipient.email,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        return NextResponse.json({
            success: true,
            results
        });

    } catch (error) {
        console.error('Email sending error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send emails'
            },
            { status: 500 }
        );
    }
}