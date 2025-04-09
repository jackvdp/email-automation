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


function createOutlookStyledEmail(content: string) {
    // First, let's clean up any potential empty paragraphs or excessive line breaks
    // that might be in the content being passed to the function
    const cleanedContent = content
        // Replace any sequence of <p><br></p> or similar with a single line break
        .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '<br>')
        // Replace any double line breaks with single ones
        .replace(/(\r\n|\n){2,}/g, '\n')
        // Remove extra spacing between markdown elements
        .replace(/\n\s*\n/g, '\n');

    return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" 
      xmlns:w="urn:schemas-microsoft-com:office:word" 
      xmlns:m="http://schemas.microsoft.com/office/2004/12/omml" 
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=us-ascii">
<meta name="Generator" content="Microsoft Word 15 (filtered medium)">
<style><!--
/* Font Definitions */
@font-face
    {font-family:"Cambria Math";
    panose-1:2 4 5 3 5 4 6 3 2 4;}
@font-face
    {font-family:Aptos;
    panose-1:2 11 0 4 2 2 2 2 2 4;}
/* Style Definitions */
p
    {margin:0;
    padding:0;
    font-size:11.0pt;
    font-family:"Aptos",sans-serif;
    line-height:1.0;} 
body
    {margin:0;
    padding:0;
    font-size:11.0pt;
    font-family:"Aptos",sans-serif;
    line-height:1.0;}
.email-content p
    {margin-bottom:0.5em;}
.email-content br + br
    {display:none;}
/* Ensure paragraphs have proper spacing, but not double spacing */
--></style>
</head>
<body lang="EN-GB" link="#467886" vlink="#96607D" style="word-wrap:break-word">
<div class="email-content">
${cleanedContent}
</div>
</body>
</html>`;
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

        const { subject, emailBody, recipients, cc, bcc, attachments } = await req.json();

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

                // Construct the email message
                const message: any = {
                    subject: personalizedSubject,
                    body: {
                        contentType: 'HTML',
                        content: createOutlookStyledEmail(personalizedBody)
                    },
                    toRecipients: [
                        {
                            emailAddress: {
                                address: recipient.email
                            }
                        }
                    ],
                    attachments: attachments || []
                };

                // Include CC if provided
                if (cc) {
                    message.ccRecipients = cc.split(',').map((email: string) => ({
                        emailAddress: {
                            address: email.trim()
                        }
                    }));
                }

                // Include BCC if provided
                if (bcc) {
                    message.bccRecipients = bcc.split(',').map((email: string) => ({
                        emailAddress: {
                            address: email.trim()
                        }
                    }));
                }

                await client.api('/me/sendMail').post({
                    message,
                    saveToSentItems: true
                });

                console.log(`Successfully sent email to ${recipient.email}`);
                results.successful.push(recipient.email);
                // Delay to respect rate limits
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