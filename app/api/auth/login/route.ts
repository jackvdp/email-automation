// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { ConfidentialClientApplication } from '@azure/msal-node';
import msalConfig from '@/utils/msalConfig';

export async function GET() {
    const cca = new ConfidentialClientApplication(msalConfig);
    const authUrl = await cca.getAuthCodeUrl({
        scopes: ['Mail.Send', 'User.Read'],
        responseMode: 'query',
        redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`
    });

    return NextResponse.redirect(authUrl);
}