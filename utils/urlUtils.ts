import { NextRequest } from 'next/server';

export function getBaseUrl(req: NextRequest): string {
    // Get host from request headers
    const host = req.headers.get('host') || '';

    // Determine protocol (http/https)
    const protocol = process.env.NODE_ENV === 'production'
        ? 'https'
        : req.headers.get('x-forwarded-proto') || 'http';

    return `${protocol}://${host}`;
}