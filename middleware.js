import { NextResponse } from 'next/server';

// Pages need a session cookie; the signature and the user's status are checked for
// real on the server (lib/auth.currentUser). API routes answer 401 themselves.
const PUBLIC = ['/login', '/invite'];

export function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api') || PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();
  if (!req.cookies.get('ra_session')?.value) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
