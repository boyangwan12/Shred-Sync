import { NextResponse, type NextRequest } from 'next/server';

// HTTP Basic Auth guard. Enabled when APP_PASSWORD is set (typically in prod).
// Skip local dev by leaving APP_PASSWORD unset.
export function middleware(request: NextRequest) {
  const expectedPassword = process.env.APP_PASSWORD;
  if (!expectedPassword) return NextResponse.next();

  const expectedUser = process.env.APP_USER ?? 'me';
  const auth = request.headers.get('authorization');

  if (auth && auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const idx = decoded.indexOf(':');
      const user = decoded.slice(0, idx);
      const pass = decoded.slice(idx + 1);
      if (user === expectedUser && pass === expectedPassword) {
        return NextResponse.next();
      }
    } catch {
      // fall through to 401
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="ShredSync"' },
  });
}

export const config = {
  // Protect everything except Next.js internals + favicon
  matcher: ['/((?!_next/|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)'],
};
