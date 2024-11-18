// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { PublicClientApplication } from '@azure/msal-node';
import msalConfig from '@/utils/msalConfig';
import { getBaseUrl } from '@/utils/urlUtils';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    const pca = new PublicClientApplication(msalConfig);
    const baseUrl = getBaseUrl(req);
    const authUrl = await pca.getAuthCodeUrl({
        scopes: ['Mail.Send', 'Mail.ReadWrite'],
        responseMode: 'query',
        redirectUri: `${baseUrl}/api/auth/callback`
    });

    return NextResponse.redirect(authUrl);
}