import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  QBO_RETURN_COOKIE,
  QBO_STATE_COOKIE,
  getAuthorizeUrl,
  quickBooksConfigured,
  safeReturnPath,
} from "@/lib/quickbooks";
import { getAdminSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const returnTo = safeReturnPath(request.nextUrl.searchParams.get("returnTo"));

  if (!(await getAdminSession())) {
    return NextResponse.redirect(new URL(`${returnTo}?qbo=adminOnly`, request.url));
  }

  if (!quickBooksConfigured()) {
    return NextResponse.redirect(new URL(`${returnTo}?qbo=notConfigured`, request.url));
  }

  const state = randomBytes(24).toString("hex");
  const response = NextResponse.redirect(getAuthorizeUrl(state));
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/quickbooks",
    maxAge: 60 * 10,
  };

  response.cookies.set(QBO_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(QBO_RETURN_COOKIE, returnTo, cookieOptions);

  return response;
}
