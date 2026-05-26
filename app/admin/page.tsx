import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createEmployeeLogin,
  deleteEmployeeLogin,
  logoutEmployee,
  promoteEmployeeToAdmin,
} from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { normalizeUsername } from "@/lib/usernames";

type AdminPageProps = {
  searchParams?: Promise<{
    created?: string;
    deleted?: string;
    promoted?: string;
    error?: string;
  }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const currentEmployee = await prisma.employeeLogin.findUnique({
    where: {
      username: normalizeUsername(employee),
    },
    select: {
      isAdmin: true,
    },
  });

  if (!currentEmployee?.isAdmin) {
    redirect("/employee-home");
  }

  const params = await searchParams;
  const employees = await prisma.employeeLogin.findMany({
    orderBy: {
      username: "asc",
    },
    select: {
      id: true,
      isAdmin: true,
      username: true,
      createdAt: true,
    },
  });

  return (
    <main className="admin-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <div className="top-actions">
        <form action={logoutEmployee}>
          <button className="logout-button" type="submit">
            Log Out
          </button>
        </form>
      </div>

      <section className="admin-panel" aria-labelledby="admin-title">
        <div className="admin-header">
          <div>
            <p className="eyebrow">Admin Panel</p>
            <h1 id="admin-title">Employee Accounts</h1>
            <p className="helper">
              Create internal logins for Healdton Service Center employees.
            </p>
          </div>
        </div>

        {params?.created === "1" ? (
          <p className="success">Employee account created.</p>
        ) : null}

        {params?.deleted === "1" ? (
          <p className="success">Employee account deleted.</p>
        ) : null}

        {params?.promoted === "1" ? (
          <p className="success">Employee promoted to admin.</p>
        ) : null}

        {params?.error === "missing" ? (
          <p className="error">Enter both a username and temporary password.</p>
        ) : null}

        {params?.error === "exists" ? (
          <p className="error">That username already exists.</p>
        ) : null}

        {params?.error === "protected" ? (
          <p className="error">The admin account cannot be deleted.</p>
        ) : null}

        {params?.error === "delete" ? (
          <p className="error">That employee could not be deleted.</p>
        ) : null}

        {params?.error === "promote" ? (
          <p className="error">That employee could not be promoted.</p>
        ) : null}

        <form className="employee-form" action={createEmployeeLogin}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input id="username" name="username" autoComplete="off" required />
          </div>

          <div className="field">
            <label htmlFor="password">Temporary Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>

          <button className="submit-button" type="submit">
            <span>Create Employee</span>
            <span className="button-mark" aria-hidden="true">
              +
            </span>
          </button>
        </form>

        <div className="employee-list">
          <h2>Current Employees</h2>
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employeeLogin) => (
                <tr key={employeeLogin.id}>
                  <td>{employeeLogin.username}</td>
                  <td>
                    {employeeLogin.isAdmin ? (
                      <span className="role-label role-label-admin">Admin</span>
                    ) : (
                      <span className="role-label">Employee</span>
                    )}
                  </td>
                  <td>{employeeLogin.createdAt.toLocaleDateString()}</td>
                  <td>
                    {normalizeUsername(employeeLogin.username) === "admin" ? (
                      <span className="protected-label">Protected</span>
                    ) : (
                      <div className="employee-actions">
                        {!employeeLogin.isAdmin ? (
                          <form action={promoteEmployeeToAdmin}>
                            <input
                              name="employeeId"
                              type="hidden"
                              value={employeeLogin.id}
                            />
                            <button className="promote-button" type="submit">
                              Promote
                            </button>
                          </form>
                        ) : null}

                        <form action={deleteEmployeeLogin}>
                          <input
                            name="employeeId"
                            type="hidden"
                            value={employeeLogin.id}
                          />
                          <button className="delete-button" type="submit">
                            Delete
                          </button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
