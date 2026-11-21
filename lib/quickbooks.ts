import { prisma } from "@/lib/prisma";
import { invoiceDateInputValue } from "@/lib/invoiceDate";
import { salesCategoryLabel } from "@/lib/salesCategories";

// QuickBooks Online integration: OAuth connection, and pushing a single
// TireShop invoice to QBO as an Invoice. Plain fetch, no SDK.
//
// Env:
//   QBO_CLIENT_ID, QBO_CLIENT_SECRET  - from the Intuit developer app
//   QBO_REDIRECT_URI                  - https://<host>/api/quickbooks/callback
//   QBO_ENVIRONMENT                   - "sandbox" (default) or "production"
//
// Local dev and the deployed app share one database, so the connection row is
// keyed by environment and every stored QBO id carries the realm (company) it
// belongs to. Ids from a different realm are ignored, not reused.

const AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const SCOPE = "com.intuit.quickbooks.accounting";
const MINOR_VERSION = "75";
// Refresh the access token this long before it actually expires.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export const QBO_STATE_COOKIE = "hsc_qbo_state";
export const QBO_RETURN_COOKIE = "hsc_qbo_return";

/** Only allow returning to a path inside this app after the OAuth round trip. */
export function safeReturnPath(value: string | null | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/invoices";
}

export class QuickBooksError extends Error {}

/** Thrown when there is no usable connection and someone must (re)connect. */
export class QuickBooksNotConnectedError extends QuickBooksError {}

type QboRef = { value: string; name?: string };

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
};

function config() {
  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  const redirectUri = process.env.QBO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new QuickBooksError(
      "QuickBooks is not configured. Set QBO_CLIENT_ID, QBO_CLIENT_SECRET and QBO_REDIRECT_URI.",
    );
  }

  return { clientId, clientSecret, redirectUri };
}

export function quickBooksEnvironment() {
  return process.env.QBO_ENVIRONMENT === "production" ? "production" : "sandbox";
}

export function quickBooksConfigured() {
  return Boolean(
    process.env.QBO_CLIENT_ID &&
      process.env.QBO_CLIENT_SECRET &&
      process.env.QBO_REDIRECT_URI,
  );
}

function apiBaseUrl() {
  return quickBooksEnvironment() === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

// ---------------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------------

export function getAuthorizeUrl(state: string) {
  const { clientId, redirectUri } = config();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: SCOPE,
    redirect_uri: redirectUri,
    state,
  });

  return `${AUTHORIZE_URL}?${params.toString()}`;
}

function basicAuthHeader() {
  const { clientId, clientSecret } = config();
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

async function requestTokens(body: Record<string, string>) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
    cache: "no-store",
  });

  const json = (await response.json().catch(() => null)) as
    | (TokenResponse & { error?: string })
    | null;

  if (!response.ok || !json?.access_token) {
    if (json?.error === "invalid_grant") {
      throw new QuickBooksNotConnectedError(
        "The QuickBooks connection has expired. Reconnect QuickBooks.",
      );
    }

    throw new QuickBooksError(
      `QuickBooks sign-in failed (${response.status}${json?.error ? `: ${json.error}` : ""}).`,
    );
  }

  return json;
}

function tokenExpiryData(tokens: TokenResponse) {
  const now = Date.now();
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accessTokenExpiresAt: new Date(now + tokens.expires_in * 1000),
    refreshTokenExpiresAt: new Date(now + tokens.x_refresh_token_expires_in * 1000),
  };
}

/** Exchange the OAuth callback code and store the connection for this environment. */
export async function completeConnection(
  code: string,
  realmId: string,
  connectedBy: string,
) {
  const tokens = await requestTokens({
    grant_type: "authorization_code",
    code,
    redirect_uri: config().redirectUri,
  });
  const environment = quickBooksEnvironment();
  const data = { realmId, connectedBy, ...tokenExpiryData(tokens) };

  await prisma.quickBooksConnection.upsert({
    where: { environment },
    create: { environment, ...data },
    update: data,
  });
}

export async function getQuickBooksConnection() {
  return prisma.quickBooksConnection.findUnique({
    where: { environment: quickBooksEnvironment() },
  });
}

async function getAccessToken(forceRefresh = false) {
  const connection = await getQuickBooksConnection();

  if (!connection) {
    throw new QuickBooksNotConnectedError("QuickBooks is not connected.");
  }

  if (connection.refreshTokenExpiresAt.getTime() <= Date.now()) {
    throw new QuickBooksNotConnectedError(
      "The QuickBooks connection has expired. Reconnect QuickBooks.",
    );
  }

  if (
    !forceRefresh &&
    connection.accessTokenExpiresAt.getTime() - REFRESH_MARGIN_MS > Date.now()
  ) {
    return { accessToken: connection.accessToken, realmId: connection.realmId };
  }

  const tokens = await requestTokens({
    grant_type: "refresh_token",
    refresh_token: connection.refreshToken,
  });

  // Intuit can rotate the refresh token; always store the newest one.
  await prisma.quickBooksConnection.update({
    where: { id: connection.id },
    data: tokenExpiryData(tokens),
  });

  return { accessToken: tokens.access_token, realmId: connection.realmId };
}

// ---------------------------------------------------------------------------
// API requests
// ---------------------------------------------------------------------------

type QboFault = {
  Fault?: {
    Error?: { Message?: string; Detail?: string; code?: string }[];
  };
};

class QboApiError extends QuickBooksError {
  constructor(
    message: string,
    readonly status: number,
    readonly codes: string[],
  ) {
    super(message);
  }
}

async function qboRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<{ data: T; realmId: string }> {
  let { accessToken, realmId } = await getAccessToken();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await fetch(
      `${apiBaseUrl()}/v3/company/${realmId}/${path}${separator}minorversion=${MINOR_VERSION}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
      },
    );

    // Token revoked or expired early: refresh once and retry.
    if (response.status === 401 && attempt === 0) {
      ({ accessToken, realmId } = await getAccessToken(true));
      continue;
    }

    const json = (await response.json().catch(() => null)) as (T & QboFault) | null;

    if (!response.ok || !json || json.Fault) {
      const errors = json?.Fault?.Error ?? [];
      const message =
        errors
          .map((error) => [error.Message, error.Detail].filter(Boolean).join(": "))
          .join("; ") || `QuickBooks request failed (${response.status}).`;

      throw new QboApiError(
        message,
        response.status,
        errors.map((error) => error.code ?? ""),
      );
    }

    return { data: json, realmId };
  }

  throw new QuickBooksNotConnectedError("QuickBooks rejected the connection. Reconnect QuickBooks.");
}

function escapeQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function qboQuery<T>(entity: string, where: string): Promise<T[]> {
  const query = `select * from ${entity} where ${where}`;
  const { data } = await qboRequest<{ QueryResponse: Record<string, T[] | undefined> }>(
    "GET",
    `query?query=${encodeURIComponent(query)}`,
  );

  return data.QueryResponse[entity] ?? [];
}

// QBO error codes we react to.
const OBJECT_NOT_FOUND = "610";
const INVALID_REFERENCE = "2500";

// ---------------------------------------------------------------------------
// Items (one QBO Product/Service per TireShop sales category)
// ---------------------------------------------------------------------------

type QboItem = { Id: string; Name: string; Active?: boolean };
type QboAccount = { Id: string; Name: string };

async function defaultIncomeAccount(): Promise<QboRef> {
  const accounts = await qboQuery<QboAccount>(
    "Account",
    "AccountType = 'Income' and Active = true",
  );

  if (accounts.length === 0) {
    throw new QuickBooksError(
      "QuickBooks has no active income account to assign new products/services to.",
    );
  }

  const preferred =
    accounts.find((account) => /^sales( of product income)?$/i.test(account.Name)) ??
    accounts.find((account) => /sales|services/i.test(account.Name)) ??
    accounts[0];

  return { value: preferred.Id, name: preferred.Name };
}

async function ensureItem(salesCategory: string, realmId: string): Promise<string> {
  const cached = await prisma.quickBooksItem.findUnique({
    where: { realmId_salesCategory: { realmId, salesCategory } },
  });

  if (cached) {
    return cached.qboItemId;
  }

  const name = salesCategoryLabel(salesCategory);
  const [existing] = await qboQuery<QboItem>(
    "Item",
    `Name = '${escapeQueryValue(name)}'`,
  );

  let itemId = existing?.Id;

  if (!itemId) {
    const { data } = await qboRequest<{ Item: QboItem }>("POST", "item", {
      Name: name,
      Type: "Service",
      IncomeAccountRef: await defaultIncomeAccount(),
    });
    itemId = data.Item.Id;
  }

  await prisma.quickBooksItem.upsert({
    where: { realmId_salesCategory: { realmId, salesCategory } },
    create: { realmId, salesCategory, qboItemId: itemId },
    update: { qboItemId: itemId },
  });

  return itemId;
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

type QboCustomer = {
  Id: string;
  DisplayName: string;
  PrimaryPhone?: { FreeFormNumber?: string };
};

type TireShopCustomer = {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  qboCustomerId: string | null;
  qboRealmId: string | null;
};

function digits(value: string | undefined | null) {
  return (value ?? "").replace(/\D/g, "");
}

async function ensureCustomer(customer: TireShopCustomer, realmId: string) {
  if (customer.qboCustomerId && customer.qboRealmId === realmId) {
    return customer.qboCustomerId;
  }

  const baseName = `${customer.firstName} ${customer.lastName}`.trim();
  const phoneDigits = digits(customer.phone);

  // Reuse a QBO customer with the same name only if the phone also matches
  // (or QBO has no phone on file), so two "John Smith"s aren't merged.
  const candidates = await qboQuery<QboCustomer>(
    "Customer",
    `DisplayName = '${escapeQueryValue(baseName)}'`,
  );
  const match = candidates.find((candidate) => {
    const candidatePhone = digits(candidate.PrimaryPhone?.FreeFormNumber);
    return !candidatePhone || !phoneDigits || candidatePhone === phoneDigits;
  });

  let customerId = match?.Id;

  if (!customerId) {
    // DisplayName must be unique in QBO; disambiguate with the phone number.
    const displayName =
      candidates.length > 0 && customer.phone
        ? `${baseName} (${customer.phone})`
        : baseName;

    const { data } = await qboRequest<{ Customer: QboCustomer }>("POST", "customer", {
      DisplayName: displayName,
      GivenName: customer.firstName.slice(0, 100),
      FamilyName: customer.lastName.slice(0, 100),
      ...(customer.phone ? { PrimaryPhone: { FreeFormNumber: customer.phone } } : {}),
      ...(customer.email ? { PrimaryEmailAddr: { Address: customer.email } } : {}),
      ...(customer.address || customer.city || customer.state || customer.zip
        ? {
            BillAddr: {
              Line1: customer.address ?? undefined,
              City: customer.city ?? undefined,
              CountrySubDivisionCode: customer.state ?? undefined,
              PostalCode: customer.zip ?? undefined,
            },
          }
        : {}),
    });
    customerId = data.Customer.Id;
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: { qboCustomerId: customerId, qboRealmId: realmId },
  });

  return customerId;
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

type QboInvoice = {
  Id: string;
  SyncToken: string;
  DocNumber?: string;
  TotalAmt?: number;
};

type QboPreferences = {
  Preferences?: {
    TaxPrefs?: {
      UsingSalesTax?: boolean;
      PartnerTaxEnabled?: boolean;
      TaxGroupCodeRef?: QboRef;
    };
  };
};

/**
 * How to send TireShop's already-calculated tax so QBO keeps it.
 *
 * - Automated Sales Tax companies (PartnerTaxEnabled, the default for US
 *   companies since 2017): TotalTax alone overrides QBO's calculation.
 * - Older manual sales tax companies (e.g. Intuit's sandbox): TotalTax is
 *   ignored unless the invoice also names a tax code, so send the company's
 *   default one and let TotalTax override its rate. Verified in sandbox:
 *   with the code, QBO's total matched TireShop to the cent; without it, tax was 0.
 */
async function taxDetail(totalTax: number) {
  const { data } = await qboRequest<QboPreferences>("GET", "preferences");
  const taxPrefs = data.Preferences?.TaxPrefs;
  const defaultTaxCode = taxPrefs?.TaxGroupCodeRef?.value;

  if (taxPrefs?.PartnerTaxEnabled !== true && defaultTaxCode) {
    return { TxnTaxCodeRef: { value: defaultTaxCode }, TotalTax: totalTax };
  }

  return { TotalTax: totalTax };
}

function loadInvoice(invoiceId: number) {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      vehicle: true,
      order: true,
      lineItems: { orderBy: { createdAt: "asc" } },
    },
  });
}

type LoadedInvoice = NonNullable<Awaited<ReturnType<typeof loadInvoice>>>;

function decimal(value: { toString(): string }) {
  return Number(value.toString());
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function vehicleText(vehicle: LoadedInvoice["vehicle"]) {
  if (!vehicle) return null;
  return [
    vehicle.color,
    vehicle.year,
    vehicle.make,
    vehicle.model,
    vehicle.unitNumber ? `Unit ${vehicle.unitNumber}` : null,
    vehicle.licensePlate ? `Plate ${vehicle.licensePlate}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

async function buildQboInvoice(invoice: LoadedInvoice, realmId: string, customerId: string) {
  const lines = [];

  for (const item of invoice.lineItems) {
    const amount = roundMoney(decimal(item.lineTotal));
    const quantity = decimal(item.quantity);
    // QBO requires Amount == Qty * UnitPrice, so discounted and complementary
    // lines carry their effective unit price; the description says why.
    const unitPrice = quantity !== 0 ? amount / quantity : 0;
    const discount = decimal(item.discountPercent);
    const notes = [
      item.complementary ? "Complementary" : discount > 0 ? `${discount}% off` : null,
      item.workPerformed ? `Work performed: ${item.workPerformed}` : null,
    ].filter(Boolean);

    lines.push({
      DetailType: "SalesItemLineDetail",
      Amount: amount,
      Description: [item.description, ...notes].join(" - ").slice(0, 4000),
      SalesItemLineDetail: {
        ItemRef: { value: await ensureItem(item.salesCategory, realmId) },
        Qty: quantity,
        UnitPrice: Number(unitPrice.toFixed(7)),
        TaxCodeRef: { value: item.taxable ? "TAX" : "NON" },
      },
    });
  }

  const vehicle = vehicleText(invoice.vehicle);
  const memo = [
    `Order ${invoice.order.orderNumber}`,
    vehicle ? `Vehicle: ${vehicle}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    CustomerRef: { value: customerId },
    DocNumber: invoice.invoiceNumber.slice(0, 21),
    TxnDate: invoiceDateInputValue(invoice),
    CustomerMemo: { value: memo.slice(0, 1000) },
    Line: lines,
    // Use the tax TireShop already calculated so QBO's total matches the
    // printed invoice.
    TxnTaxDetail: await taxDetail(roundMoney(decimal(invoice.taxAmount))),
  };
}

/** Find the QBO invoice this TireShop invoice already became, if any. */
async function findExistingQboInvoice(invoice: LoadedInvoice, realmId: string) {
  if (invoice.qboInvoiceId && invoice.qboRealmId === realmId) {
    try {
      const { data } = await qboRequest<{ Invoice: QboInvoice }>(
        "GET",
        `invoice/${invoice.qboInvoiceId}`,
      );
      return data.Invoice;
    } catch (error) {
      // Deleted in QBO: fall through and look it up / create it again.
      if (!(error instanceof QboApiError && error.codes.includes(OBJECT_NOT_FOUND))) {
        throw error;
      }
    }
  }

  // Guard against duplicates if the stored id was lost.
  const [byDocNumber] = await qboQuery<QboInvoice>(
    "Invoice",
    `DocNumber = '${escapeQueryValue(invoice.invoiceNumber.slice(0, 21))}'`,
  );

  return byDocNumber ?? null;
}

async function sendInvoice(invoice: LoadedInvoice) {
  const { realmId } = await getAccessToken();
  const customerId = await ensureCustomer(invoice.customer, realmId);
  const payload = await buildQboInvoice(invoice, realmId, customerId);
  const existing = await findExistingQboInvoice(invoice, realmId);

  const { data } = await qboRequest<{ Invoice: QboInvoice }>(
    "POST",
    "invoice",
    existing ? { ...payload, Id: existing.Id, SyncToken: existing.SyncToken } : payload,
  );

  return { qboInvoiceId: data.Invoice.Id, realmId, qboTotal: data.Invoice.TotalAmt };
}

/**
 * Create or update the QBO invoice for a TireShop invoice and record the
 * outcome on the invoice row. Returns the error message on failure.
 */
export async function pushInvoiceToQuickBooks(
  invoiceId: number,
): Promise<{ ok: true } | { ok: false; error: string; notConnected: boolean }> {
  try {
    let invoice = await loadInvoice(invoiceId);

    if (!invoice) {
      return { ok: false, error: "Invoice not found.", notConnected: false };
    }

    let result;

    try {
      result = await sendInvoice(invoice);
    } catch (error) {
      // A cached item or customer was deleted/made inactive in QBO: forget the
      // cached ids and try once more from scratch.
      if (!(error instanceof QboApiError && error.codes.includes(INVALID_REFERENCE))) {
        throw error;
      }

      const { realmId } = await getAccessToken();
      await prisma.quickBooksItem.deleteMany({ where: { realmId } });
      await prisma.customer.update({
        where: { id: invoice.customerId },
        data: { qboCustomerId: null, qboRealmId: null },
      });
      invoice = (await loadInvoice(invoiceId))!;
      result = await sendInvoice(invoice);
    }

    // The invoice now exists in QBO either way; record it so a resend updates
    // it. But don't call it a success if QBO's total disagrees with ours
    // (e.g. QBO recalculated tax) - someone needs to look at it.
    const expectedTotal = roundMoney(decimal(invoice.total));
    const totalMismatch =
      typeof result.qboTotal === "number" &&
      Math.abs(result.qboTotal - expectedTotal) > 0.005
        ? `Sent, but the QuickBooks total ($${result.qboTotal.toFixed(2)}) doesn't match this invoice ($${expectedTotal.toFixed(2)}). Check the tax on the QuickBooks invoice.`
        : null;

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        qboInvoiceId: result.qboInvoiceId,
        qboRealmId: result.realmId,
        qboSyncedAt: new Date(),
        qboSyncError: totalMismatch,
      },
    });

    if (totalMismatch) {
      return { ok: false, error: totalMismatch, notConnected: false };
    }

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof QuickBooksError
        ? error.message
        : "Unexpected error while sending to QuickBooks.";

    if (!(error instanceof QuickBooksError)) {
      console.error("QuickBooks push failed", error);
    }

    await prisma.invoice
      .update({
        where: { id: invoiceId },
        data: { qboSyncError: message.slice(0, 1000) },
      })
      .catch(() => null);

    return {
      ok: false,
      error: message,
      notConnected: error instanceof QuickBooksNotConnectedError,
    };
  }
}
