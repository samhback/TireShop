import type { Metadata } from "next";
import { SHOP } from "@/lib/shop";

export const metadata: Metadata = {
  title: `Privacy Policy | ${SHOP.name}`,
};

const EFFECTIVE_DATE = "November 20, 2026";

export default function PrivacyPage() {
  return (
    <main className="placeholder-shell">
      <article className="placeholder-panel legal-panel">
        <p className="eyebrow">{SHOP.name}</p>
        <h1>Privacy Policy</h1>
        <p className="helper">Effective {EFFECTIVE_DATE}</p>

        <p>
          This Privacy Policy explains how {SHOP.name} (&quot;we,&quot;
          &quot;us&quot;) collects, uses, and protects information in our
          internal shop management application (the &quot;Application&quot;),
          including information exchanged with third-party services such as
          Intuit QuickBooks Online.
        </p>

        <h2>1. Information We Collect</h2>
        <ul>
          <li>
            <strong>Employee account information:</strong> usernames and login
            credentials used to access the Application.
          </li>
          <li>
            <strong>Customer and business records:</strong> names, phone
            numbers, addresses, company accounts, vehicle details, work orders,
            quotes, invoices, payments, and inventory entered by our staff.
          </li>
          <li>
            <strong>Accounting data:</strong> when connected to QuickBooks
            Online, we access the company, customer, invoice, item, and payment
            data needed to keep records in sync, along with authorization tokens
            issued by Intuit.
          </li>
          <li>
            <strong>Technical data:</strong> session cookies required to keep
            you signed in.
          </li>
        </ul>

        <h2>2. How We Use Information</h2>
        <ul>
          <li>To operate the shop: create orders, quotes, invoices, and statements;</li>
          <li>To synchronize financial records with our accounting system;</li>
          <li>To authenticate employees and secure the Application;</li>
          <li>To maintain service history and comply with legal and tax obligations.</li>
        </ul>

        <h2>3. How We Share Information</h2>
        <p>
          We do not sell or rent personal information. We share information
          only:
        </p>
        <ul>
          <li>
            With service providers that host and run the Application (such as
            our database and hosting providers) and with Intuit when the
            QuickBooks integration is enabled;
          </li>
          <li>When required by law, regulation, or legal process;</li>
          <li>To protect the rights, property, or safety of {SHOP.name}, our customers, or others.</li>
        </ul>

        <h2>4. Data Security</h2>
        <p>
          We use reasonable administrative, technical, and physical safeguards,
          including encrypted connections (HTTPS), restricted employee access,
          and secure storage of third-party authorization tokens. No system is
          completely secure, and we cannot guarantee absolute security.
        </p>

        <h2>5. Data Retention</h2>
        <p>
          We keep business and customer records for as long as needed to operate
          the shop and meet legal, tax, and accounting requirements. Access to
          QuickBooks can be disconnected at any time, after which stored
          authorization tokens are revoked or deleted.
        </p>

        <h2>6. Your Choices</h2>
        <p>
          Customers may contact us to request access to, correction of, or
          deletion of their personal information, subject to records we are
          legally required to keep.
        </p>

        <h2>7. Cookies</h2>
        <p>
          The Application uses only essential cookies needed for sign-in. We do
          not use advertising or tracking cookies.
        </p>

        <h2>8. Children&apos;s Privacy</h2>
        <p>
          The Application is not directed to children under 13, and we do not
          knowingly collect their information.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. The effective
          date above shows when it was last revised.
        </p>

        <h2>10. Contact</h2>
        <p>
          Questions about this policy can be sent to:
          <br />
          {SHOP.name}
          {SHOP.addressLines.map((line) => (
            <span key={line}>
              <br />
              {line}
            </span>
          ))}
        </p>
        <p>
          See also our <a href="/eula">End-User License Agreement</a>.
        </p>
      </article>
    </main>
  );
}
