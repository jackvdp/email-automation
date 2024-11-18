// app/api/auth/logout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import sessionStore from '@/utils/sessionStore';
import { getBaseUrl } from '@/utils/urlUtils';

export async function GET(req: NextRequest) {
    const baseUrl = getBaseUrl(req);
    const tenantId = process.env.AZURE_TENANT_ID;
    const postLogoutRedirectUri = process.env.NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI || baseUrl;

    if (!tenantId) {
        console.error('AZURE_TENANT_ID is not defined in environment variables.');
        return NextResponse.redirect(baseUrl);
    }

    const response = NextResponse.redirect(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`
    );

    try {
        // Retrieve the 'graph-session' cookie
        const sessionCookie = req.cookies.get('graph-session');
        if (sessionCookie) {
            const sessionId = sessionCookie.value;
            console.log(`Logging out session ID: ${sessionId}`);

            // Delete the session from the server-side session store
            const deleted = sessionStore.del(sessionId);
            if (deleted) {
                console.log(`Session ${sessionId} deleted successfully.`);
            } else {
                console.warn(`Session ${sessionId} could not be deleted or did not exist.`);
            }

            // Clear the 'graph-session' cookie
            response.cookies.set('graph-session', '', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/', // Ensure the cookie is cleared across all routes
                expires: new Date(0), // Set expiration to the past to delete the cookie
            });
        } else {
            console.warn('No graph-session cookie found.');
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Even if there's an error, proceed with redirecting to logout URL
    }

    return response;
}