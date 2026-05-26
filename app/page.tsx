import { loginEmployee } from "@/app/actions";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const hasError = params?.error === "invalid";

  return (
    <main className="auth-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <p className="eyebrow">Healdton Service Center</p>
        <h1 id="login-title">Employee Login</h1>
        <p className="helper">Sign in to access the internal shop system.</p>

        {hasError ? (
          <p className="error">Invalid username or password.</p>
        ) : null}

        <form action={loginEmployee}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          <button className="submit-button" type="submit">
            <span>Sign In</span>
            <span className="button-mark" aria-hidden="true">
              →
            </span>
          </button>
        </form>
      </section>
    </main>
  );
}
