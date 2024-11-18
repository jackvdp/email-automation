// app/api/auth/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
    const sessionToken = cookies().get('graph-session')?.value;

    return NextResponse.json({
        isAuthenticated: !!sessionToken
    });
}