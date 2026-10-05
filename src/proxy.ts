import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/**
 * First line of defence for the staff area: unauthenticated requests to /admin/* are
 * redirected to the login page. Every admin page and Server Action also re-checks the
 * session, the user's active status and their role permission on the server (see
 * `requirePage` / `requirePermission`), so this is not the only protection.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const isLoginPage = pathname === "/admin/login";

  if (!session && !isLoginPage) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // A signed-in visitor on the login page is NOT redirected here: the token may belong to a
  // disabled/revoked account, which only the database can tell. The login page checks that.

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
