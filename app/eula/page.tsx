import type { Metadata } from "next";
import { SHOP } from "@/lib/shop";

export const metadata: Metadata = {
  title: `End-User License Agreement | ${SHOP.name}`,
};

const EFFECTIVE_DATE = "November 20, 2026";

export default function EulaPage() {
  return (
    <main className="placeholder-shell">
      <article className="placeholder-panel legal-panel">
        <p className="eyebrow">{SHOP.name}</p>
        <h1>End-User License Agreement</h1>
        <p className="helper">Effective {EFFECTIVE_DATE}</p>

        <p>
          This End-User License Agreement (&quot;Agreement&quot;) governs your use
          of the {SHOP.name} shop management application (the
          &quot;Application&quot;), including any integrations it provides with
          third-party services such as QuickBooks Online. By accessing or using
          the Application, you agree to this Agreement.
        </p>

        <h2>1. License</h2>
        <p>
          {SHOP.name} grants you a limited, non-exclusive, non-transferable,
          revocable license to use the Application solely for the internal
          business operations of {SHOP.name}.
        </p>

        <h2>2. Authorized Users</h2>
        <p>
          The Application is intended only for employees and authorized
          personnel of {SHOP.name}. You are responsible for keeping your login
          credentials confidential and for all activity under your account.
        </p>

        <h2>3. Restrictions</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Copy, modify, distribute, sell, or sublicense the Application;</li>
          <li>Reverse engineer or attempt to extract the source code of the Application;</li>
          <li>Use the Application for any unlawful purpose or in violation of any third-party terms;</li>
          <li>Attempt to gain unauthorized access to the Application or its related systems or data.</li>
        </ul>

        <h2>4. Third-Party Services</h2>
        <p>
          The Application may connect to third-party services, including Intuit
          QuickBooks Online. Your use of those services is governed by their
          own terms and privacy policies. {SHOP.name} is not responsible for the
          availability or operation of third-party services.
        </p>

        <h2>5. Data</h2>
        <p>
          Data entered into or synchronized through the Application remains the
          property of {SHOP.name}. Our handling of data is described in our{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>

        <h2>6. Disclaimer of Warranties</h2>
        <p>
          The Application is provided &quot;as is&quot; and &quot;as
          available&quot; without warranties of any kind, express or implied,
          including warranties of merchantability, fitness for a particular
          purpose, and non-infringement.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, {SHOP.name} will not be liable
          for any indirect, incidental, special, consequential, or punitive
          damages, or any loss of data, revenue, or profits, arising from your
          use of or inability to use the Application.
        </p>

        <h2>8. Termination</h2>
        <p>
          This license is effective until terminated. {SHOP.name} may suspend or
          terminate your access at any time, including when your employment or
          authorization ends. Upon termination you must stop using the
          Application.
        </p>

        <h2>9. Changes</h2>
        <p>
          We may update this Agreement from time to time. Continued use of the
          Application after changes take effect constitutes acceptance of the
          revised Agreement.
        </p>

        <h2>10. Governing Law</h2>
        <p>
          This Agreement is governed by the laws of the State of Oklahoma,
          without regard to its conflict-of-law principles.
        </p>

        <h2>11. Contact</h2>
        <p>
          {SHOP.name}
          {SHOP.addressLines.map((line) => (
            <span key={line}>
              <br />
              {line}
            </span>
          ))}
        </p>
      </article>
    </main>
  );
}
