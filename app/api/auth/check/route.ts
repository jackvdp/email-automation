// app/api/auth/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import sessionStore from '@/utils/sessionStore';

export async function GET(req: NextRequest) {
    const sessionToken = cookies().get('graph-session')?.value;
    var sessionID: string | undefined;

    if (sessionToken) {
        sessionID = sessionStore.get(sessionToken);
    }

    console.log(`***** Session token: ${sessionToken}, Session ID: ${sessionID}`);

    return NextResponse.json({
        isAuthenticated: !!sessionToken,
    });
}