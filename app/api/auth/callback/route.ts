// app/api/auth/callback/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { ConfidentialClientApplication } from '@azure/msal-node';
import msalConfig from '@/utils/msalConfig';
import { v4 as uuidv4 } from 'uuid';
import sessionStore from '@/utils/sessionStore';
import { getBaseUrl } from '@/utils/urlUtils';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const baseUrl = getBaseUrl(req);

    if (!code) {
        return NextResponse.redirect(`${baseUrl}/error?message=No_authorization_code`);
    }

    const cca = new ConfidentialClientApplication(msalConfig);

    try {
        const tokenRequest = {
            code,
            scopes: ['Mail.Send', 'User.Read'],
            redirectUri: `${baseUrl}/api/auth/callback`
        };

        const response = await cca.acquireTokenByCode(tokenRequest);
        if (!response?.account) {
            throw new Error('No account in response');
        }

        console.log('graph-session (homeAccountId):', response.account.homeAccountId);

        // Serialize token cache
        const tokenCache = await cca.getTokenCache().serialize();

        // Generate a unique session ID
        const sessionId = uuidv4();

        // Store the token cache server-side with a TTL of 24 hours
        sessionStore.set(sessionId, tokenCache, { ttl: 24 * 60 * 60 }); // 24 hours in seconds

        if (!baseUrl) {
            throw new Error('No base URL found');
        }

        const newResponse = NextResponse.redirect(baseUrl);

        // Set only the session ID in the cookie
        newResponse.cookies.set('graph-session', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/', // Ensure it's accessible to all routes
            maxAge: 24 * 60 * 60 // 24 hours in seconds
        });

        return newResponse;
    } catch (error) {
        console.error('Auth error:', error);
        return NextResponse.redirect(`${baseUrl}/error?message=Authentication_failed`);
    }
}