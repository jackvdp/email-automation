// app/api/send-emails/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { cookies } from 'next/headers';
import msalConfig from '@/utils/msalConfig';
import sessionStore from '@/utils/sessionStore';

function replaceTemplateVariables(template: string, data: Record<string, string>): string {
    return template.replace(/\${(\w+)}/g, (match, key) => data[key] || match);
}

async function getGraphClient(sessionId: string) {
    const cca = new ConfidentialClientApplication(msalConfig);

    // Retrieve the token cache from the session store
    const cachedData = sessionStore.get(sessionId);
    console.log('Deserialized token cache:', cachedData);

    if (cachedData) {
        await cca.getTokenCache().deserialize(cachedData);
    }

    // Retrieve all accounts and select the first one
    const accounts = await cca.getTokenCache().getAllAccounts();
    const account = accounts[0];
    console.log('Account:', account);

    if (!account) {
        throw new Error('User not authenticated');
    }

    const silentRequest = {
        account,
        scopes: ['Mail.Send', 'User.Read']
    };

    const result = await cca.acquireTokenSilent(silentRequest);

    return Client.init({
        authProvider: (done) => done(null, result.accessToken)
    });
}

export async function POST(req: NextRequest) {
    try {
        const sessionId = cookies().get('graph-session')?.value;

        console.log('Session ID:', sessionId);
        if (!sessionId) {
            return NextResponse.json(
                { success: false, error: 'User not authenticated' },
                { status: 401 }
            );
        }

        const { subject, emailBody, recipients } = await req.json();

        if (!subject || !emailBody || !recipients?.length) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        console.log(`Preparing to send ${recipients.length} emails`);
        const client = await getGraphClient(sessionId);

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
                results.failed.push({
                    email: recipient.email,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

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
        console.error('Error sending emails:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}