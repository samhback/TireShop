import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { normalizeUsername } from "@/lib/usernames";

const SESSION_COOKIE = "hsc_employee";

export async function setEmployeeSession(username: string) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, username, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function getEmployeeSession() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function clearEmployeeSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getAdminSession() {
  const username = await getEmployeeSession();

  if (!username) {
    return null;
  }

  const employee = await prisma.employeeLogin.findUnique({
    where: { username: normalizeUsername(username) },
    select: { isAdmin: true },
  });

  return employee?.isAdmin ? username : null;
}
