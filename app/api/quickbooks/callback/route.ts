import { NextResponse, type NextRequest } from "next/server";
import {
  QBO_RETURN_COOKIE,
  QBO_STATE_COOKIE,
  completeConnection,
  safeReturnPath,
} from "@/lib/quickbooks";
import { getAdminSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const returnTo = safeReturnPath(request.cookies.get(QBO_RETURN_COOKIE)?.value);
  const expectedState = request.cookies.get(QBO_STATE_COOKIE)?.value;

  const finish = (outcome: string) => {
    const response = NextResponse.redirect(
      new URL(`${returnTo}?qbo=${outcome}`, request.url),
    );
    response.cookies.delete({ name: QBO_STATE_COOKIE, path: "/api/quickbooks" });
    response.cookies.delete({ name: QBO_RETURN_COOKIE, path: "/api/quickbooks" });
    return response;
  };

  const admin = await getAdminSession();

  if (!admin) {
    return finish("adminOnly");
  }

  const code = params.get("code");
  const realmId = params.get("realmId");

  if (
    params.get("error") ||
    !code ||
    !realmId ||
    !expectedState ||
    params.get("state") !== expectedState
  ) {
    return finish("connectFailed");
  }

  try {
    await completeConnection(code, realmId, admin);
  } catch (error) {
    console.error("QuickBooks connect failed", error);
    return finish("connectFailed");
  }

  return finish("connected");
}
