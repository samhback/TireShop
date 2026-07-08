"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  clearEmployeeSession,
  getEmployeeSession,
  setEmployeeSession,
} from "@/lib/session";
import { getInventoryCategory } from "@/lib/inventoryCategories";
import { defaultInventorySalesCategory, salesCategoryOptions } from "@/lib/salesCategories";
import { normalizeUsername } from "@/lib/usernames";
import {
  REGULAR_TIRE_DISPOSAL_DESCRIPTION,
  SEMI_TIRE_DISPOSAL_DESCRIPTION,
  getSalesTaxRate,
  isTireDisposalLine,
} from "@/lib/tax";

async function currentEmployeeIsAdmin() {
  const currentEmployee = await getEmployeeSession();

  if (!currentEmployee) {
    return false;
  }

  const employee = await prisma.employeeLogin.findUnique({
    where: {
      username: normalizeUsername(currentEmployee),
    },
    select: {
      isAdmin: true,
    },
  });

  return employee?.isAdmin === true;
}

export async function loginEmployee(formData: FormData) {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");

  const employee = await prisma.employeeLogin.findUnique({
    where: { username },
  });

  if (!employee || employee.password !== password) {
    redirect("/?error=invalid");
  }

  await setEmployeeSession(employee.username);
  redirect("/employee-home");
}

export async function logoutEmployee() {
  await clearEmployeeSession();
  redirect("/");
}

export async function createEmployeeLogin(formData: FormData) {
  if (!(await currentEmployeeIsAdmin())) {
    redirect("/employee-home");
  }

  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    redirect("/admin?error=missing");
  }

  try {
    await prisma.employeeLogin.create({
      data: {
        username,
        password,
        isAdmin: false,
      },
    });
  } catch {
    redirect("/admin?error=exists");
  }

  redirect("/admin?created=1");
}

export async function deleteEmployeeLogin(formData: FormData) {
  if (!(await currentEmployeeIsAdmin())) {
    redirect("/employee-home");
  }

  const employeeId = Number(formData.get("employeeId"));

  if (!Number.isInteger(employeeId)) {
    redirect("/admin?error=delete");
  }

  const employee = await prisma.employeeLogin.findUnique({
    where: {
      id: employeeId,
    },
    select: {
      isAdmin: true,
      username: true,
    },
  });

  if (!employee || normalizeUsername(employee.username) === "admin") {
    redirect("/admin?error=protected");
  }

  await prisma.employeeLogin.delete({
    where: {
      id: employeeId,
    },
  });

  redirect("/admin?deleted=1");
}

export async function promoteEmployeeToAdmin(formData: FormData) {
  if (!(await currentEmployeeIsAdmin())) {
    redirect("/employee-home");
  }

  const employeeId = Number(formData.get("employeeId"));

  if (!Number.isInteger(employeeId)) {
    redirect("/admin?error=promote");
  }

  await prisma.employeeLogin.update({
    where: {
      id: employeeId,
    },
    data: {
      isAdmin: true,
    },
  });

  redirect("/admin?promoted=1");
}

export async function createEmployeeProfile(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    redirect("/employees/add?error=invalid");
  }

  await prisma.employeeProfile.create({
    data: {
      name,
      phone: nullableValue(formData, "phone"),
      email: nullableValue(formData, "email"),
    },
  });

  redirect("/employees/add?created=1");
}

export async function updateEmployeeProfile(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const employeeId = Number(formData.get("employeeId"));
  const name = String(formData.get("name") ?? "").trim();

  if (!Number.isInteger(employeeId) || !name) {
    redirect(`/employees/${employeeId || ""}/edit?error=invalid`);
  }

  await prisma.employeeProfile.update({
    where: {
      id: employeeId,
    },
    data: {
      name,
      phone: nullableValue(formData, "phone"),
      email: nullableValue(formData, "email"),
    },
  });

  redirect("/employees?updated=1");
}

export async function searchEmployeeProfiles(query: string) {
  const employee = await getEmployeeSession();

  if (!employee) {
    return [];
  }

  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const contains = {
    contains: normalizedQuery,
    mode: Prisma.QueryMode.insensitive,
  };

  const employees = await prisma.employeeProfile.findMany({
    where: {
      OR: [{ name: contains }, { phone: contains }, { email: contains }],
    },
    orderBy: {
      name: "asc",
    },
    take: 50,
  });

  return employees.map((profile) => ({
    id: profile.id,
    name: profile.name,
    phone: profile.phone,
    email: profile.email,
  }));
}

export async function createCompany(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const name = String(formData.get("name") ?? "").trim();
  const useCompanyMarkup = formData.get("useCompanyMarkup") === "on";
  const markupPercent = useCompanyMarkup
    ? Number(formData.get("markupPercent"))
    : 0;

  if (
    !name ||
    (useCompanyMarkup && (Number.isNaN(markupPercent) || markupPercent < 0))
  ) {
    redirect("/companies/add?error=invalid");
  }

  const company = await prisma.company.create({
    data: {
      name,
      billingAddress: nullableValue(formData, "billingAddress"),
      email: nullableValue(formData, "email"),
      useCompanyMarkup,
      markupPercent,
      notes: nullableValue(formData, "notes"),
    },
  });

  redirect(`/companies/${company.id}?created=1`);
}

export async function updateCompany(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const companyId = Number(formData.get("companyId"));
  const name = String(formData.get("name") ?? "").trim();
  const useCompanyMarkup = formData.get("useCompanyMarkup") === "on";
  const markupPercent = useCompanyMarkup
    ? Number(formData.get("markupPercent"))
    : null;

  if (
    !Number.isInteger(companyId) ||
    !name ||
    (useCompanyMarkup &&
      (markupPercent === null ||
        Number.isNaN(markupPercent) ||
        markupPercent < 0))
  ) {
    redirect(`/companies/${companyId || ""}/edit?error=invalid`);
  }

  await prisma.company.update({
    where: {
      id: companyId,
    },
    data: {
      name,
      billingAddress: nullableValue(formData, "billingAddress"),
      email: nullableValue(formData, "email"),
      useCompanyMarkup,
      ...(markupPercent === null ? {} : { markupPercent }),
      notes: nullableValue(formData, "notes"),
    },
  });

  redirect(`/companies/${companyId}?updated=1`);
}

export async function attachCustomerToCompany(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const companyId = Number(formData.get("companyId"));
  const customerId = Number(formData.get("customerId"));

  if (!Number.isInteger(companyId) || !Number.isInteger(customerId)) {
    redirect(`/companies/${companyId || ""}?error=employee`);
  }

  const [company, customer] = await Promise.all([
    prisma.company.findUnique({
      where: {
        id: companyId,
      },
      select: {
        id: true,
      },
    }),
    prisma.customer.findUnique({
      where: {
        id: customerId,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!company || !customer) {
    redirect(`/companies/${companyId}?error=employee`);
  }

  await prisma.customer.update({
    where: {
      id: customerId,
    },
    data: {
      companyId,
    },
  });

  redirect(`/companies/${companyId}?employeeAdded=1`);
}

function nullableValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function createOrderNumber() {
  return `HSC-${Date.now().toString(36).toUpperCase()}`;
}

const FIRST_INVOICE_NUMBER = 1000;

// Sequential numeric invoice numbers (1000, 1001, ...). Computed inside the
// creating transaction so two invoices made at once can't reuse a value. The
// unique constraint on invoiceNumber is the final backstop.
async function nextInvoiceNumber(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(invoice_number::int) AS max
    FROM "invoices"
    WHERE invoice_number ~ '^[0-9]+$'
  `;
  const currentMax = Number(rows[0]?.max ?? 0);
  return String(
    currentMax >= FIRST_INVOICE_NUMBER ? currentMax + 1 : FIRST_INVOICE_NUMBER,
  );
}

function orderLineTotal(
  quantity: number,
  unitPrice: number,
  discountPercent = 0,
  complementary = false,
) {
  if (complementary) {
    return 0;
  }

  const subtotal = quantity * unitPrice;
  const discountMultiplier = 1 - discountPercent / 100;

  return Number((subtotal * discountMultiplier).toFixed(2));
}

function currentTaxRate() {
  return getSalesTaxRate();
}

function calculateInvoiceTotals(
  lineItems: {
    lineTotal: number | { toString(): string };
    taxable: boolean;
  }[],
) {
  const subtotal = lineItems.reduce(
    (total, lineItem) => total + Number(lineItem.lineTotal.toString()),
    0,
  );
  const taxableSubtotal = lineItems.reduce(
    (total, lineItem) =>
      total + (lineItem.taxable ? Number(lineItem.lineTotal.toString()) : 0),
    0,
  );
  const taxRate = currentTaxRate();
  const taxAmount = Number((taxableSubtotal * taxRate).toFixed(2));

  return {
    subtotal,
    taxableSubtotal,
    taxRate,
    taxAmount,
    total: Number((subtotal + taxAmount).toFixed(2)),
  };
}

const REGULAR_TIRE_DISPOSAL_FEE = 3;
const SEMI_TIRE_DISPOSAL_FEE = 6;

function tireDisposalLines(
  item: {
    name: string;
    regularTireDisposal: boolean;
    semiTireDisposal: boolean;
  },
  quantity: number,
) {
  const lines = [];

  if (item.regularTireDisposal) {
    lines.push({
      description: REGULAR_TIRE_DISPOSAL_DESCRIPTION,
      unitPrice: REGULAR_TIRE_DISPOSAL_FEE,
    });
  }

  if (item.semiTireDisposal) {
    lines.push({
      description: SEMI_TIRE_DISPOSAL_DESCRIPTION,
      unitPrice: SEMI_TIRE_DISPOSAL_FEE,
    });
  }

  return lines.map((line) => ({
    lineType: "custom",
    serviceItemId: null,
    inventoryItemId: null,
    category: "fees",
    salesCategory: "parts",
    description: line.description,
    quantity,
    unitPrice: line.unitPrice,
    costAtSale: null,
    discountPercent: 0,
    complementary: false,
    lineTotal: orderLineTotal(quantity, line.unitPrice),
    taxable: false,
    taxAmount: 0,
    notes: `For ${item.name}`,
    performedByName: null,
  }));
}

type QuickInvoiceLineInput = {
  id?: unknown;
  quantity?: unknown;
};

function parseQuickInvoiceLines(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const lines = parsed
      .map((line: QuickInvoiceLineInput) => ({
        id: Number(line.id),
        quantity: Number(line.quantity),
      }))
      .filter(
        (line) =>
          Number.isInteger(line.id) &&
          line.id > 0 &&
          !Number.isNaN(line.quantity) &&
          line.quantity > 0,
      );

    return lines.reduce<{ id: number; quantity: number }[]>((merged, line) => {
      const existingLine = merged.find((item) => item.id === line.id);

      if (existingLine) {
        existingLine.quantity += line.quantity;
      } else {
        merged.push(line);
      }

      return merged;
    }, []);
  } catch {
    return [];
  }
}

function splitCustomerName(customerName: string) {
  const nameParts = customerName.trim().split(/\s+/).filter(Boolean);

  if (nameParts.length === 0) {
    return null;
  }

  if (nameParts.length === 1) {
    return {
      firstName: nameParts[0],
      lastName: "Walk-In",
    };
  }

  return {
    firstName: nameParts[0],
    lastName: nameParts.slice(1).join(" "),
  };
}

function validSalesCategory(value: string, fallback: string) {
  return salesCategoryOptions.some((category) => category.value === value)
    ? value
    : fallback;
}

function validPaymentPurpose(value: string) {
  return ["invoice", "account", "deposit", "applied_credit"].includes(value)
    ? value
    : "invoice";
}

function validCustomerAccountEntryType(value: string) {
  return [
    "payment_on_account",
    "deposit",
    "credit",
    "applied_credit",
    "late_fee",
  ].includes(value);
}

function optionalIntegerValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? Number(value) : null;
}

async function orderHasVehicle(orderId: number) {
  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      vehicleId: true,
    },
  });

  return Boolean(order?.vehicleId);
}

function companyInventoryUnitPrice(
  item: { cost: { toString(): string }; sellPrice: { toString(): string } },
  companyMarkupPercent: number | { toString(): string } | null | undefined,
) {
  if (companyMarkupPercent === null || companyMarkupPercent === undefined) {
    return Number(item.sellPrice.toString());
  }

  return Number(
    (
      Number(item.cost.toString()) *
      (1 + Number(companyMarkupPercent.toString()) / 100)
    ).toFixed(2),
  );
}

async function recalculateCompanyInventoryLines(orderId: number) {
  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      isCompanyCar: true,
      companyMarkupPercent: true,
      lineItems: {
        where: {
          lineType: "inventory",
          inventoryItemId: {
            not: null,
          },
        },
        include: {
          inventoryItem: true,
        },
      },
    },
  });

  if (!order) {
    return;
  }

  for (const lineItem of order.lineItems) {
    if (!lineItem.inventoryItem) {
      continue;
    }

    const quantity = Number(lineItem.quantity.toString());
    const discountPercent = Number(lineItem.discountPercent.toString());
    const unitPrice = order.isCompanyCar
      ? companyInventoryUnitPrice(
          lineItem.inventoryItem,
          order.companyMarkupPercent,
        )
      : Number(lineItem.inventoryItem.sellPrice.toString());

    await prisma.orderLineItem.update({
      where: {
        id: lineItem.id,
      },
      data: {
        unitPrice,
        lineTotal: orderLineTotal(
          quantity,
          unitPrice,
          discountPercent,
          lineItem.complementary,
        ),
      },
    });
  }
}

function inventorySellPriceFromFormData(formData: FormData, cost: number) {
  const pricingMode = String(formData.get("pricingMode") ?? "sale");

  if (pricingMode === "markup") {
    const markupPercent = Number(formData.get("markupPercent"));

    if (Number.isNaN(markupPercent) || markupPercent < 0) {
      return Number.NaN;
    }

    return Number((cost * (1 + markupPercent / 100)).toFixed(2));
  }

  return Number(formData.get("sellPrice"));
}

export async function createInventoryItem(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const category = String(formData.get("category") ?? "").trim();
  const categoryConfig = getInventoryCategory(category);
  const name = String(formData.get("name") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  const cost = Number(formData.get("cost"));
  const sellPrice = inventorySellPriceFromFormData(formData, cost);
  const lowStockThreshold = Number(formData.get("lowStockThreshold") || 0);
  const salesCategory = validSalesCategory(
    String(formData.get("salesCategory") ?? ""),
    defaultInventorySalesCategory(category),
  );

  if (
    !categoryConfig ||
    !name ||
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    Number.isNaN(cost) ||
    cost < 0 ||
    Number.isNaN(sellPrice) ||
    sellPrice < 0 ||
    !Number.isInteger(lowStockThreshold) ||
    lowStockThreshold < 0
  ) {
    redirect(`/inventory/add/${category || "tires"}?error=invalid`);
  }

  await prisma.inventoryItem.create({
    data: {
      category,
      name,
      partNumber: nullableValue(formData, "partNumber"),
      brand: nullableValue(formData, "brand"),
      quantity,
      cost,
      sellPrice,
      taxable: formData.get("taxable") === "on",
      regularTireDisposal: formData.get("regularTireDisposal") === "on",
      semiTireDisposal: formData.get("semiTireDisposal") === "on",
      salesCategory,
      lowStockThreshold,
      notes: nullableValue(formData, "notes"),
      tireSize: nullableValue(formData, "tireSize"),
      model: nullableValue(formData, "model"),
      loadRating: nullableValue(formData, "loadRating"),
      oilWeight: nullableValue(formData, "oilWeight"),
      oilType: nullableValue(formData, "oilType"),
      packageSize: nullableValue(formData, "packageSize"),
      fluidType: nullableValue(formData, "fluidType"),
      specification: nullableValue(formData, "specification"),
      filterType: nullableValue(formData, "filterType"),
      fitment: nullableValue(formData, "fitment"),
      batteryGroup: nullableValue(formData, "batteryGroup"),
      cca: nullableValue(formData, "cca"),
      warranty: nullableValue(formData, "warranty"),
      brakeComponent: nullableValue(formData, "brakeComponent"),
      position: nullableValue(formData, "position"),
      itemType: nullableValue(formData, "itemType"),
      sizeOrBulbNumber: nullableValue(formData, "sizeOrBulbNumber"),
      supplyType: nullableValue(formData, "supplyType"),
      unit: nullableValue(formData, "unit"),
      storageLocation: nullableValue(formData, "storageLocation"),
      partType: nullableValue(formData, "partType"),
    },
  });

  redirect(`/inventory/add/${category}?created=1`);
}

export async function updateInventoryItem(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const itemId = Number(formData.get("itemId"));
  const category = String(formData.get("category") ?? "").trim();
  const categoryConfig = getInventoryCategory(category);
  const name = String(formData.get("name") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  const cost = Number(formData.get("cost"));
  const sellPrice = inventorySellPriceFromFormData(formData, cost);
  const lowStockThreshold = Number(formData.get("lowStockThreshold") || 0);
  const salesCategory = validSalesCategory(
    String(formData.get("salesCategory") ?? ""),
    defaultInventorySalesCategory(category),
  );

  if (
    !Number.isInteger(itemId) ||
    !categoryConfig ||
    !name ||
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    Number.isNaN(cost) ||
    cost < 0 ||
    Number.isNaN(sellPrice) ||
    sellPrice < 0 ||
    !Number.isInteger(lowStockThreshold) ||
    lowStockThreshold < 0
  ) {
    redirect(`/inventory/${itemId || ""}/edit?error=invalid`);
  }

  await prisma.inventoryItem.update({
    where: {
      id: itemId,
    },
    data: {
      category,
      name,
      partNumber: nullableValue(formData, "partNumber"),
      brand: nullableValue(formData, "brand"),
      quantity,
      cost,
      sellPrice,
      taxable: formData.get("taxable") === "on",
      regularTireDisposal: formData.get("regularTireDisposal") === "on",
      semiTireDisposal: formData.get("semiTireDisposal") === "on",
      salesCategory,
      lowStockThreshold,
      notes: nullableValue(formData, "notes"),
      tireSize: nullableValue(formData, "tireSize"),
      model: nullableValue(formData, "model"),
      loadRating: nullableValue(formData, "loadRating"),
      oilWeight: nullableValue(formData, "oilWeight"),
      oilType: nullableValue(formData, "oilType"),
      packageSize: nullableValue(formData, "packageSize"),
      fluidType: nullableValue(formData, "fluidType"),
      specification: nullableValue(formData, "specification"),
      filterType: nullableValue(formData, "filterType"),
      fitment: nullableValue(formData, "fitment"),
      batteryGroup: nullableValue(formData, "batteryGroup"),
      cca: nullableValue(formData, "cca"),
      warranty: nullableValue(formData, "warranty"),
      brakeComponent: nullableValue(formData, "brakeComponent"),
      position: nullableValue(formData, "position"),
      itemType: nullableValue(formData, "itemType"),
      sizeOrBulbNumber: nullableValue(formData, "sizeOrBulbNumber"),
      supplyType: nullableValue(formData, "supplyType"),
      unit: nullableValue(formData, "unit"),
      storageLocation: nullableValue(formData, "storageLocation"),
      partType: nullableValue(formData, "partType"),
    },
  });

  redirect("/inventory?updated=1");
}

export async function createServiceItem(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const category = String(formData.get("category") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const pricingMethod = String(formData.get("pricingMethod") ?? "").trim();
  const flatPrice = Number(formData.get("flatPrice"));
  const hourlyRate = Number(formData.get("hourlyRate"));
  const estimatedHoursValue = String(formData.get("estimatedHours") ?? "").trim();
  const estimatedHours = estimatedHoursValue ? Number(estimatedHoursValue) : null;
  const salesCategory = validSalesCategory(
    String(formData.get("salesCategory") ?? ""),
    "labor",
  );

  const flatPriceInvalid =
    pricingMethod === "flat" && (Number.isNaN(flatPrice) || flatPrice < 0);
  const hourlyRateInvalid =
    pricingMethod === "hourly" && (Number.isNaN(hourlyRate) || hourlyRate < 0);
  const optionalNumbersInvalid =
    estimatedHours !== null &&
    (Number.isNaN(estimatedHours) || estimatedHours < 0);

  if (
    !category ||
    !name ||
    !["flat", "hourly"].includes(pricingMethod) ||
    flatPriceInvalid ||
    hourlyRateInvalid ||
    optionalNumbersInvalid
  ) {
    redirect("/services/add?error=invalid");
  }

  await prisma.serviceItem.create({
    data: {
      category,
      name,
      description: nullableValue(formData, "description"),
      pricingMethod,
      flatPrice: pricingMethod === "flat" ? flatPrice : null,
      hourlyRate: pricingMethod === "hourly" ? hourlyRate : null,
      estimatedHours,
      taxable: formData.get("taxable") === "on",
      salesCategory,
      active: formData.get("active") === "on",
      notes: nullableValue(formData, "notes"),
    },
  });

  redirect("/services/add?created=1");
}

export async function updateServiceItem(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const serviceId = Number(formData.get("serviceId"));
  const category = String(formData.get("category") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const pricingMethod = String(formData.get("pricingMethod") ?? "").trim();
  const flatPrice = Number(formData.get("flatPrice"));
  const hourlyRate = Number(formData.get("hourlyRate"));
  const estimatedHoursValue = String(formData.get("estimatedHours") ?? "").trim();
  const estimatedHours = estimatedHoursValue ? Number(estimatedHoursValue) : null;
  const salesCategory = validSalesCategory(
    String(formData.get("salesCategory") ?? ""),
    "labor",
  );

  const flatPriceInvalid =
    pricingMethod === "flat" && (Number.isNaN(flatPrice) || flatPrice < 0);
  const hourlyRateInvalid =
    pricingMethod === "hourly" && (Number.isNaN(hourlyRate) || hourlyRate < 0);
  const optionalNumbersInvalid =
    estimatedHours !== null &&
    (Number.isNaN(estimatedHours) || estimatedHours < 0);

  if (
    !Number.isInteger(serviceId) ||
    !category ||
    !name ||
    !["flat", "hourly"].includes(pricingMethod) ||
    flatPriceInvalid ||
    hourlyRateInvalid ||
    optionalNumbersInvalid
  ) {
    redirect(`/services/${serviceId || ""}/edit?error=invalid`);
  }

  await prisma.serviceItem.update({
    where: {
      id: serviceId,
    },
    data: {
      category,
      name,
      description: nullableValue(formData, "description"),
      pricingMethod,
      flatPrice: pricingMethod === "flat" ? flatPrice : null,
      hourlyRate: pricingMethod === "hourly" ? hourlyRate : null,
      estimatedHours,
      taxable: formData.get("taxable") === "on",
      salesCategory,
      active: formData.get("active") === "on",
      notes: nullableValue(formData, "notes"),
    },
  });

  redirect("/services?updated=1");
}

export async function searchServices(query: string) {
  const employee = await getEmployeeSession();

  if (!employee) {
    return [];
  }

  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const contains = {
    contains: normalizedQuery,
    mode: Prisma.QueryMode.insensitive,
  };

  const services = await prisma.serviceItem.findMany({
    where: {
      OR: [
        { name: contains },
        { category: contains },
        { description: contains },
        { pricingMethod: contains },
        { notes: contains },
      ],
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    take: 50,
  });

  return services.map((service) => ({
    id: service.id,
    category: service.category,
    name: service.name,
    description: service.description,
    pricingMethod: service.pricingMethod,
    flatPrice: service.flatPrice?.toString() ?? null,
    hourlyRate: service.hourlyRate?.toString() ?? null,
    estimatedHours: service.estimatedHours?.toString() ?? null,
    active: service.active,
    notes: service.notes,
  }));
}

export async function searchInventory(query: string) {
  const employee = await getEmployeeSession();

  if (!employee) {
    return [];
  }

  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const contains = {
    contains: normalizedQuery,
    mode: Prisma.QueryMode.insensitive,
  };

  const items = await prisma.inventoryItem.findMany({
    where: {
      OR: [
        { name: contains },
        { partNumber: contains },
        { brand: contains },
        { category: contains },
        { tireSize: contains },
        { model: contains },
        { loadRating: contains },
        { oilWeight: contains },
        { oilType: contains },
        { fluidType: contains },
        { specification: contains },
        { filterType: contains },
        { fitment: contains },
        { batteryGroup: contains },
        { cca: contains },
        { brakeComponent: contains },
        { position: contains },
        { itemType: contains },
        { sizeOrBulbNumber: contains },
        { supplyType: contains },
        { unit: contains },
        { storageLocation: contains },
        { partType: contains },
      ],
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    take: 50,
  });

  return items.map((item) => ({
    id: item.id,
    category: item.category,
    name: item.name,
    partNumber: item.partNumber,
    brand: item.brand,
    quantity: item.quantity,
    cost: item.cost.toString(),
    sellPrice: item.sellPrice.toString(),
    regularTireDisposal: item.regularTireDisposal,
    semiTireDisposal: item.semiTireDisposal,
    lowStockThreshold: item.lowStockThreshold,
    tireSize: item.tireSize,
    model: item.model,
    loadRating: item.loadRating,
    notes: item.notes,
  }));
}

export async function createCustomer(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  if (!prisma.customer) {
    throw new Error(
      "Prisma client is missing the Customer model. Run `npx prisma generate` and restart the dev server.",
    );
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const year = String(formData.get("year") ?? "").trim();
  const make = String(formData.get("make") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const mileageValue = String(formData.get("mileage") ?? "").trim();
  const mileage = mileageValue ? Number(mileageValue) : null;
  const companyId = optionalIntegerValue(formData, "companyId");
  const returnToCompanyId = optionalIntegerValue(formData, "returnToCompanyId");

  if (
    !firstName ||
    !lastName ||
    !phone ||
    !year ||
    !make ||
    !model ||
    (companyId !== null && !Number.isInteger(companyId)) ||
    (returnToCompanyId !== null && !Number.isInteger(returnToCompanyId)) ||
    (mileage !== null && (!Number.isInteger(mileage) || mileage < 0))
  ) {
    redirect("/customers/add?error=invalid");
  }

  if (companyId !== null) {
    const company = await prisma.company.findUnique({
      where: {
        id: companyId,
      },
      select: {
        id: true,
      },
    });

    if (!company) {
      redirect("/customers/add?error=invalid");
    }
  }

  await prisma.customer.create({
    data: {
      companyId,
      firstName,
      lastName,
      phone,
      email: nullableValue(formData, "email"),
      address: nullableValue(formData, "address"),
      city: nullableValue(formData, "city"),
      state: nullableValue(formData, "state"),
      zip: nullableValue(formData, "zip"),
      preferredContactMethod: nullableValue(formData, "preferredContactMethod"),
      notes: nullableValue(formData, "customerNotes"),
      vehicles: {
        create: {
          year,
          make,
          model,
          trim: nullableValue(formData, "trim"),
          vin: nullableValue(formData, "vin"),
          licensePlate: nullableValue(formData, "licensePlate"),
          plateState: nullableValue(formData, "plateState"),
          color: nullableValue(formData, "color"),
          mileage,
          engineSize: nullableValue(formData, "engineSize"),
          transmissionType: nullableValue(formData, "transmissionType"),
          transmissionDetails: nullableValue(formData, "transmissionDetails"),
          fuelType: nullableValue(formData, "fuelType"),
          driveType: nullableValue(formData, "driveType"),
          tireSize: nullableValue(formData, "tireSize"),
          notes: nullableValue(formData, "vehicleNotes"),
        },
      },
    },
  });

  if (returnToCompanyId && returnToCompanyId === companyId) {
    redirect(`/companies/${returnToCompanyId}?employeeAdded=1`);
  }

  redirect("/customers/add?created=1");
}

export async function searchCustomers(query: string) {
  const employee = await getEmployeeSession();

  if (!employee) {
    return [];
  }

  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const contains = {
    contains: normalizedQuery,
    mode: Prisma.QueryMode.insensitive,
  };

  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { firstName: contains },
        { lastName: contains },
        { phone: contains },
        { email: contains },
        {
          company: {
            name: contains,
          },
        },
        { vehicles: {
          some: {
            OR: [
              { year: contains },
              { make: contains },
              { model: contains },
              { vin: contains },
              { licensePlate: contains },
              { color: contains },
              { engineSize: contains },
              { transmissionType: contains },
              { transmissionDetails: contains },
              { fuelType: contains },
              { driveType: contains },
              { tireSize: contains },
            ],
          },
        } },
      ],
    },
    include: {
      company: true,
      vehicles: {
        include: {
          _count: {
            select: {
              invoices: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 50,
  });

  return customers.map((customer) => ({
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    email: customer.email,
    company: customer.company
      ? {
          id: customer.company.id,
          name: customer.company.name,
        }
      : null,
    notes: customer.notes,
    vehicles: customer.vehicles.map((vehicle) => ({
      id: vehicle.id,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      vin: vehicle.vin,
      licensePlate: vehicle.licensePlate,
      color: vehicle.color,
      mileage: vehicle.mileage,
      engineSize: vehicle.engineSize,
      transmissionType: vehicle.transmissionType,
      transmissionDetails: vehicle.transmissionDetails,
      fuelType: vehicle.fuelType,
      driveType: vehicle.driveType,
      tireSize: vehicle.tireSize,
      historyCount: vehicle._count.invoices,
    })),
  }));
}

export async function createDraftOrderForCustomer(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const customerId = Number(formData.get("customerId"));

  if (!Number.isInteger(customerId)) {
    redirect("/orders/new?error=customer");
  }

  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
    select: {
      id: true,
    },
  });

  if (!customer) {
    redirect("/orders/new?error=customer");
  }

  const order = await prisma.order.create({
    data: {
      orderNumber: createOrderNumber(),
      status: "draft",
      customerId,
      createdBy: employee,
    },
  });

  redirect(`/orders/${order.id}`);
}

export async function attachVehicleToOrder(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const orderId = Number(formData.get("orderId"));
  const vehicleId = Number(formData.get("vehicleId"));

  if (!Number.isInteger(orderId) || !Number.isInteger(vehicleId)) {
    redirect(`/orders/${orderId || ""}?error=vehicle`);
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      customerId: true,
    },
  });

  const vehicle = await prisma.vehicle.findUnique({
    where: {
      id: vehicleId,
    },
    select: {
      customerId: true,
    },
  });

  if (!order || !vehicle || order.customerId !== vehicle.customerId) {
    redirect(`/orders/${orderId}?error=vehicle`);
  }

  await prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      vehicleId,
    },
  });

  redirect(`/orders/${orderId}?vehicleAttached=1`);
}

export async function createVehicleForOrder(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const orderId = Number(formData.get("orderId"));
  const customerId = Number(formData.get("customerId"));
  const year = String(formData.get("year") ?? "").trim();
  const make = String(formData.get("make") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const mileageValue = String(formData.get("mileage") ?? "").trim();
  const mileage = mileageValue ? Number(mileageValue) : null;

  if (
    !Number.isInteger(orderId) ||
    !Number.isInteger(customerId) ||
    !year ||
    !make ||
    !model ||
    (mileage !== null && (!Number.isInteger(mileage) || mileage < 0))
  ) {
    redirect(`/orders/${orderId || ""}?error=vehicle`);
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      customerId: true,
    },
  });

  if (!order || order.customerId !== customerId) {
    redirect(`/orders/${orderId}?error=vehicle`);
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      customerId,
      year,
      make,
      model,
      trim: nullableValue(formData, "trim"),
      vin: nullableValue(formData, "vin"),
      licensePlate: nullableValue(formData, "licensePlate"),
      plateState: nullableValue(formData, "plateState"),
      color: nullableValue(formData, "color"),
      mileage,
      engineSize: nullableValue(formData, "engineSize"),
      transmissionType: nullableValue(formData, "transmissionType"),
      transmissionDetails: nullableValue(formData, "transmissionDetails"),
      fuelType: nullableValue(formData, "fuelType"),
      driveType: nullableValue(formData, "driveType"),
      tireSize: nullableValue(formData, "tireSize"),
      notes: nullableValue(formData, "vehicleNotes"),
    },
  });

  await prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      vehicleId: vehicle.id,
    },
  });

  redirect(`/orders/${orderId}?vehicleAdded=1`);
}

export async function updateOrderQuotedBy(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const orderId = Number(formData.get("orderId"));
  const quotedByEmployeeIdValue = String(
    formData.get("quotedByEmployeeId") ?? "",
  ).trim();
  const quotedByEmployeeId = quotedByEmployeeIdValue
    ? Number(quotedByEmployeeIdValue)
    : null;

  if (
    !Number.isInteger(orderId) ||
    (quotedByEmployeeId !== null && !Number.isInteger(quotedByEmployeeId))
  ) {
    redirect(`/orders/${orderId || ""}?error=quotedBy`);
  }

  await prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      quotedByEmployeeId,
    },
  });

  redirect(`/orders/${orderId}?quotedByUpdated=1`);
}

export async function updateOrderCustomerNotes(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const orderId = Number(formData.get("orderId"));
  const customerNotes = String(formData.get("customerNotes") ?? "").trim();

  if (!Number.isInteger(orderId)) {
    redirect(`/orders/${orderId || ""}?error=customerNotes`);
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!order || ["completed", "canceled"].includes(order.status)) {
    redirect(`/orders/${orderId}?error=customerNotes`);
  }

  await prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      notes: customerNotes || null,
    },
  });

  redirect(`/orders/${orderId}?customerNotesUpdated=1`);
}

export async function updateOrderCompanyCar(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const orderId = Number(formData.get("orderId"));
  const isCompanyCar = formData.get("isCompanyCar") === "on";
  const companyId = optionalIntegerValue(formData, "companyId");
  const redirectOnSave = formData.get("redirectOnSave") !== "false";

  if (
    !Number.isInteger(orderId) ||
    (companyId !== null && !Number.isInteger(companyId)) ||
    (isCompanyCar && companyId === null)
  ) {
    redirect(`/orders/${orderId || ""}?error=company`);
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!order || ["completed", "canceled"].includes(order.status)) {
    redirect(`/orders/${orderId}?error=company`);
  }

  const company = companyId
    ? await prisma.company.findUnique({
        where: {
          id: companyId,
        },
      })
    : null;

  if (isCompanyCar && !company) {
    redirect(`/orders/${orderId}?error=company`);
  }

  await prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      isCompanyCar,
      companyId: isCompanyCar ? company!.id : null,
      companyNameSnapshot: isCompanyCar ? company!.name : null,
      companyMarkupPercent:
        isCompanyCar && company!.useCompanyMarkup
          ? company!.markupPercent
          : null,
    },
  });

  await recalculateCompanyInventoryLines(orderId);

  if (redirectOnSave) {
    redirect(`/orders/${orderId}?companyUpdated=1`);
  }
}

export async function searchOrders(query: string) {
  const employee = await getEmployeeSession();

  if (!employee) {
    return [];
  }

  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const contains = {
    contains: normalizedQuery,
    mode: Prisma.QueryMode.insensitive,
  };

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { orderNumber: contains },
        { status: contains },
        {
          customer: {
            OR: [
              { firstName: contains },
              { lastName: contains },
              { phone: contains },
              { email: contains },
            ],
          },
        },
        {
          vehicle: {
            OR: [
              { year: contains },
              { make: contains },
              { model: contains },
              { color: contains },
              { vin: contains },
              { licensePlate: contains },
              { tireSize: contains },
            ],
          },
        },
      ],
    },
    include: {
      customer: true,
      vehicle: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 50,
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    updatedAt: order.updatedAt.toISOString(),
    customer: {
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      phone: order.customer.phone,
    },
    vehicle: order.vehicle
      ? {
          year: order.vehicle.year,
          make: order.vehicle.make,
          model: order.vehicle.model,
          color: order.vehicle.color,
          licensePlate: order.vehicle.licensePlate,
        }
      : null,
  }));
}

export async function searchInvoices(query: string) {
  const employee = await getEmployeeSession();

  if (!employee) {
    return [];
  }

  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const contains = {
    contains: normalizedQuery,
    mode: Prisma.QueryMode.insensitive,
  };

  const invoices = await prisma.invoice.findMany({
    where: {
      OR: [
        { invoiceNumber: contains },
        { status: contains },
        {
          order: {
            orderNumber: contains,
          },
        },
        {
          customer: {
            OR: [
              { firstName: contains },
              { lastName: contains },
              { phone: contains },
              { email: contains },
            ],
          },
        },
        {
          vehicle: {
            OR: [
              { year: contains },
              { make: contains },
              { model: contains },
              { color: contains },
              { vin: contains },
              { licensePlate: contains },
              { tireSize: contains },
            ],
          },
        },
      ],
    },
    include: {
      customer: true,
      vehicle: true,
      order: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return invoices.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    orderNumber: invoice.order.orderNumber,
    status: invoice.status,
    total: invoice.total.toString(),
    createdAt: invoice.createdAt.toISOString(),
    paidAt: invoice.paidAt?.toISOString() ?? null,
    paidByUsername: invoice.paidByUsername,
    customer: {
      firstName: invoice.customer.firstName,
      lastName: invoice.customer.lastName,
      phone: invoice.customer.phone,
    },
    vehicle: invoice.vehicle
      ? {
          year: invoice.vehicle.year,
          make: invoice.vehicle.make,
          model: invoice.vehicle.model,
          color: invoice.vehicle.color,
          licensePlate: invoice.vehicle.licensePlate,
        }
      : null,
  }));
}

export async function acceptQuote(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const orderId = Number(formData.get("orderId"));

  if (!Number.isInteger(orderId)) {
    redirect(`/orders/${orderId || ""}?error=status`);
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      quotedByEmployeeId: true,
    },
  });

  if (!order?.quotedByEmployeeId) {
    redirect(`/orders/${orderId}?error=quotedByRequired`);
  }

  await prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      status: "approved",
      quoteAcceptedAt: new Date(),
      quoteRejectedAt: null,
      quoteRejectionReason: null,
    },
  });

  redirect(`/orders/${orderId}?quoteAccepted=1`);
}

export async function rejectQuote(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const orderId = Number(formData.get("orderId"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!Number.isInteger(orderId) || !reason) {
    redirect(`/orders/${orderId || ""}?error=rejection`);
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      quotedByEmployeeId: true,
    },
  });

  if (!order?.quotedByEmployeeId) {
    redirect(`/orders/${orderId}?error=quotedByRequired`);
  }

  await prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      status: "rejected",
      quoteRejectedAt: new Date(),
      quoteRejectionReason: reason,
    },
  });

  redirect(`/orders/${orderId}?quoteRejected=1`);
}

export async function cancelApprovedOrder(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const orderId = Number(formData.get("orderId"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!Number.isInteger(orderId) || !reason) {
    redirect(`/orders/${orderId || ""}?error=cancellation`);
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      status: true,
      quotedByEmployeeId: true,
    },
  });

  if (!order || order.status === "canceled") {
    redirect(`/orders/${orderId}?error=status`);
  }

  if (!order.quotedByEmployeeId) {
    redirect(`/orders/${orderId}?error=quotedByRequired`);
  }

  await prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      status: "canceled",
      canceledAt: new Date(),
      cancellationReason: reason,
    },
  });

  redirect("/employee-home");
}

export async function addServiceToOrder(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const orderId = Number(formData.get("orderId"));
  const serviceId = Number(formData.get("serviceId"));

  if (!Number.isInteger(orderId) || !Number.isInteger(serviceId)) {
    redirect(`/orders/${orderId || ""}?error=lineItem`);
  }

  if (!(await orderHasVehicle(orderId))) {
    redirect(`/orders/${orderId}?error=vehicleRequired`);
  }

  const service = await prisma.serviceItem.findUnique({
    where: {
      id: serviceId,
    },
  });

  if (!service) {
    redirect(`/orders/${orderId}?error=lineItem`);
  }

  const quantity =
    service.pricingMethod === "hourly"
      ? Number(service.estimatedHours?.toString() ?? "1")
      : 1;
  const unitPrice = Number(
    service.pricingMethod === "hourly"
      ? service.hourlyRate?.toString() ?? "0"
      : service.flatPrice?.toString() ?? "0",
  );

  await prisma.orderLineItem.create({
    data: {
      orderId,
      lineType: "service",
      serviceItemId: service.id,
      description: service.name,
      quantity,
      unitPrice,
      lineTotal: orderLineTotal(quantity, unitPrice),
      notes: service.description,
    },
  });

  redirect(`/orders/${orderId}?lineAdded=1`);
}

export async function addInventoryToOrder(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const orderId = Number(formData.get("orderId"));
  const inventoryItemId = Number(formData.get("inventoryItemId"));
  const quantity = Number(formData.get("quantity"));

  if (
    !Number.isInteger(orderId) ||
    !Number.isInteger(inventoryItemId) ||
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    redirect(`/orders/${orderId || ""}?error=lineItem`);
  }

  if (!(await orderHasVehicle(orderId))) {
    redirect(`/orders/${orderId}?error=vehicleRequired`);
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      isCompanyCar: true,
      companyMarkupPercent: true,
    },
  });

  if (!order) {
    redirect(`/orders/${orderId}?error=lineItem`);
  }

  const item = await prisma.inventoryItem.findUnique({
    where: {
      id: inventoryItemId,
    },
  });

  if (!item) {
    redirect(`/orders/${orderId}?error=lineItem`);
  }

  const existingOrderLines = await prisma.orderLineItem.findMany({
    where: {
      orderId,
      inventoryItemId,
    },
    select: {
      quantity: true,
    },
  });
  const reservedQuantity = existingOrderLines.reduce(
    (total, line) => total + Number(line.quantity.toString()),
    0,
  );
  const availableQuantity = item.quantity - reservedQuantity;

  if (quantity > availableQuantity) {
    redirect(`/orders/${orderId}?error=lineItem`);
  }

  const unitPrice = order.isCompanyCar
    ? companyInventoryUnitPrice(item, order.companyMarkupPercent)
    : Number(item.sellPrice.toString());

  await prisma.orderLineItem.createMany({
    data: [
      {
        orderId,
        lineType: "inventory",
        inventoryItemId: item.id,
        description: item.name,
        quantity,
        unitPrice,
        lineTotal: orderLineTotal(quantity, unitPrice),
        notes:
          [
            item.brand,
            item.partNumber ? `Part # ${item.partNumber}` : null,
            item.tireSize,
          ]
            .filter(Boolean)
            .join(" | ") || null,
      },
      ...tireDisposalLines(item, quantity).map((line) => ({
        orderId,
        lineType: line.lineType,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        notes: line.notes,
      })),
    ],
  });

  redirect(`/orders/${orderId}?lineAdded=1`);
}

export async function addCustomLineToOrder(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const orderId = Number(formData.get("orderId"));
  const description = String(formData.get("description") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  const unitPrice = Number(formData.get("unitPrice"));

  if (
    !Number.isInteger(orderId) ||
    !description ||
    Number.isNaN(quantity) ||
    quantity <= 0 ||
    Number.isNaN(unitPrice) ||
    unitPrice < 0
  ) {
    redirect(`/orders/${orderId || ""}?error=lineItem`);
  }

  if (!(await orderHasVehicle(orderId))) {
    redirect(`/orders/${orderId}?error=vehicleRequired`);
  }

  await prisma.orderLineItem.create({
    data: {
      orderId,
      lineType: "custom",
      description,
      quantity,
      unitPrice,
      lineTotal: orderLineTotal(quantity, unitPrice),
      notes: nullableValue(formData, "notes"),
    },
  });

  redirect(`/orders/${orderId}?lineAdded=1`);
}

export async function removeOrderLineItem(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const orderId = Number(formData.get("orderId"));
  const lineItemId = Number(formData.get("lineItemId"));

  if (!Number.isInteger(orderId) || !Number.isInteger(lineItemId)) {
    redirect(`/orders/${orderId || ""}?error=lineItem`);
  }

  await prisma.orderLineItem.delete({
    where: {
      id: lineItemId,
    },
  });

  redirect(`/orders/${orderId}?lineRemoved=1`);
}

export async function updateOrderLineItemAdjustment(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const orderId = Number(formData.get("orderId"));
  const lineItemId = Number(formData.get("lineItemId"));
  const discountPercent = Number(formData.get("discountPercent") || 0);
  const complementary = formData.get("complementary") === "on";

  if (
    !Number.isInteger(orderId) ||
    !Number.isInteger(lineItemId) ||
    Number.isNaN(discountPercent) ||
    discountPercent < 0 ||
    discountPercent > 100
  ) {
    redirect(`/orders/${orderId || ""}?error=lineItem`);
  }

  const lineItem = await prisma.orderLineItem.findUnique({
    where: {
      id: lineItemId,
    },
  });

  if (
    !lineItem ||
    lineItem.orderId !== orderId ||
    !["service", "inventory"].includes(lineItem.lineType)
  ) {
    redirect(`/orders/${orderId}?error=lineItem`);
  }

  const quantity = Number(lineItem.quantity.toString());
  const unitPrice = Number(lineItem.unitPrice.toString());

  await prisma.orderLineItem.update({
    where: {
      id: lineItemId,
    },
    data: {
      complementary,
      discountPercent: complementary ? 0 : discountPercent,
      lineTotal: orderLineTotal(
        quantity,
        unitPrice,
        complementary ? 0 : discountPercent,
        complementary,
      ),
    },
  });

  redirect(`/orders/${orderId}?lineUpdated=1`);
}

export async function updateOrderLineItemPerformedBy(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const orderId = Number(formData.get("orderId"));
  const lineItemId = Number(formData.get("lineItemId"));
  const performedByEmployeeIdValue = String(
    formData.get("performedByEmployeeId") ?? "",
  ).trim();
  const performedByEmployeeId = performedByEmployeeIdValue
    ? Number(performedByEmployeeIdValue)
    : null;

  if (
    !Number.isInteger(orderId) ||
    !Number.isInteger(lineItemId) ||
    (performedByEmployeeId !== null && !Number.isInteger(performedByEmployeeId))
  ) {
    redirect(`/orders/${orderId || ""}?error=performedBy`);
  }

  const lineItem = await prisma.orderLineItem.findUnique({
    where: {
      id: lineItemId,
    },
    select: {
      orderId: true,
      lineType: true,
    },
  });

  if (!lineItem || lineItem.orderId !== orderId || lineItem.lineType !== "service") {
    redirect(`/orders/${orderId}?error=performedBy`);
  }

  await prisma.orderLineItem.update({
    where: {
      id: lineItemId,
    },
    data: {
      performedByEmployeeId,
    },
  });

  redirect(`/orders/${orderId}?performedByUpdated=1`);
}

export async function completeOrder(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const orderId = Number(formData.get("orderId"));

  if (!Number.isInteger(orderId)) {
    redirect(`/orders/${orderId || ""}?error=complete`);
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      invoice: true,
      lineItems: {
        include: {
          performedByEmployee: true,
          inventoryItem: true,
          serviceItem: true,
        },
      },
    },
  });

  if (!order) {
    redirect(`/orders/${orderId}?error=complete`);
  }

  if (order.invoice) {
    redirect(`/invoices/${order.invoice.id}`);
  }

  if (
    order.status !== "approved" ||
    !order.vehicleId ||
    !order.quotedByEmployeeId ||
    order.lineItems.length === 0
  ) {
    redirect(`/orders/${orderId}?error=complete`);
  }

  const missingPerformedBy = order.lineItems.some(
    (lineItem) =>
      lineItem.lineType === "service" && !lineItem.performedByEmployeeId,
  );

  if (missingPerformedBy) {
    redirect(`/orders/${orderId}?error=performedByRequired`);
  }

  const inventoryLines = order.lineItems.filter(
    (lineItem) => lineItem.lineType === "inventory" && lineItem.inventoryItemId,
  );

  for (const lineItem of inventoryLines) {
    const quantity = Number(lineItem.quantity.toString());
    const item = await prisma.inventoryItem.findUnique({
      where: {
        id: lineItem.inventoryItemId!,
      },
      select: {
        quantity: true,
      },
    });

    if (!item || item.quantity < quantity) {
      redirect(`/orders/${orderId}?error=inventory`);
    }
  }

  const invoiceLineItems = order.lineItems.map((lineItem) => {
    const taxable =
      lineItem.lineType === "inventory"
        ? lineItem.inventoryItem?.taxable ?? true
        : lineItem.lineType === "service"
          ? lineItem.serviceItem?.taxable ?? true
          : isTireDisposalLine(lineItem.description)
            ? false
          : true;

    return {
      lineType: lineItem.lineType,
      serviceItemId: lineItem.serviceItemId,
      inventoryItemId: lineItem.inventoryItemId,
      category:
        lineItem.lineType === "inventory"
          ? lineItem.inventoryItem?.category ?? null
          : lineItem.lineType === "service"
            ? lineItem.serviceItem?.category ?? null
            : null,
      salesCategory:
        lineItem.lineType === "inventory"
          ? lineItem.inventoryItem?.salesCategory ?? "parts"
          : lineItem.lineType === "service"
            ? lineItem.serviceItem?.salesCategory ?? "labor"
            : "parts",
      description: lineItem.description,
      quantity: lineItem.quantity,
      unitPrice: lineItem.unitPrice,
      costAtSale:
        lineItem.lineType === "inventory"
          ? lineItem.inventoryItem?.cost ?? null
          : null,
      discountPercent: lineItem.discountPercent,
      complementary: lineItem.complementary,
      taxable,
      taxAmount: 0,
      lineTotal: lineItem.lineTotal,
      notes: lineItem.notes,
      performedByName: lineItem.performedByEmployee?.name ?? null,
    };
  });
  const invoiceTotals = calculateInvoiceTotals(invoiceLineItems);

  const invoice = await prisma.$transaction(async (tx) => {
    for (const lineItem of inventoryLines) {
      await tx.inventoryItem.update({
        where: {
          id: lineItem.inventoryItemId!,
        },
        data: {
          quantity: {
            decrement: Number(lineItem.quantity.toString()),
          },
        },
      });
    }

    const createdInvoice = await tx.invoice.create({
      data: {
        invoiceNumber: await nextInvoiceNumber(tx),
        orderId: order.id,
        customerId: order.customerId,
        vehicleId: order.vehicleId,
        status: "unpaid",
        subtotal: invoiceTotals.subtotal,
        taxableSubtotal: invoiceTotals.taxableSubtotal,
        taxRate: invoiceTotals.taxRate,
        taxAmount: invoiceTotals.taxAmount,
        total: invoiceTotals.total,
        lineItems: {
          create: invoiceLineItems,
        },
      },
    });

    await tx.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    return createdInvoice;
  });

  redirect(`/invoices/${invoice.id}`);
}

export async function createQuickInvoice(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const customerName = String(formData.get("customerName") ?? "").trim();
  const quotedByEmployeeId = Number(formData.get("quotedByEmployeeId"));
  const companyId = optionalIntegerValue(formData, "companyId");
  const isCompanyCar = formData.get("isCompanyCar") === "on";
  const serviceLines = parseQuickInvoiceLines(formData.get("serviceLines"));
  const inventoryLines = parseQuickInvoiceLines(formData.get("inventoryLines"));
  const customerNameParts = splitCustomerName(customerName);

  if (
    !customerNameParts ||
    !Number.isInteger(quotedByEmployeeId) ||
    (companyId !== null && !Number.isInteger(companyId)) ||
    (isCompanyCar && companyId === null) ||
    (serviceLines.length === 0 && inventoryLines.length === 0)
  ) {
    redirect("/invoices/quick?error=invalid");
  }

  const quotedByEmployee = await prisma.employeeProfile.findUnique({
    where: {
      id: quotedByEmployeeId,
    },
  });

  if (!quotedByEmployee) {
    redirect("/invoices/quick?error=invalid");
  }

  const company = companyId
    ? await prisma.company.findUnique({
        where: {
          id: companyId,
        },
      })
    : null;

  if (isCompanyCar && !company) {
    redirect("/invoices/quick?error=invalid");
  }

  const serviceIds = serviceLines.map((line) => line.id);
  const inventoryIds = inventoryLines.map((line) => line.id);

  const [services, inventoryItems] = await Promise.all([
    serviceIds.length
      ? prisma.serviceItem.findMany({
          where: {
            id: {
              in: serviceIds,
            },
          },
        })
      : Promise.resolve([]),
    inventoryIds.length
      ? prisma.inventoryItem.findMany({
          where: {
            id: {
              in: inventoryIds,
            },
          },
        })
      : Promise.resolve([]),
  ]);

  if (
    services.length !== serviceIds.length ||
    inventoryItems.length !== inventoryIds.length
  ) {
    redirect("/invoices/quick?error=invalid");
  }

  for (const inventoryLine of inventoryLines) {
    const item = inventoryItems.find(
      (inventoryItem) => inventoryItem.id === inventoryLine.id,
    );

    if (!item || item.quantity < inventoryLine.quantity) {
      redirect("/invoices/quick?error=inventory");
    }
  }

  const serviceOrderLines = serviceLines.map((line) => {
    const service = services.find((serviceItem) => serviceItem.id === line.id)!;
    const unitPrice = Number(
      service.pricingMethod === "hourly"
        ? service.hourlyRate?.toString() ?? "0"
        : service.flatPrice?.toString() ?? "0",
    );

    return {
      lineType: "service",
      serviceItemId: service.id,
      inventoryItemId: null,
      description: service.name,
      quantity: line.quantity,
      unitPrice,
      discountPercent: 0,
      complementary: false,
      lineTotal: orderLineTotal(line.quantity, unitPrice),
      category: service.category,
      salesCategory: service.salesCategory,
      costAtSale: null,
      taxable: service.taxable,
      taxAmount: 0,
      notes: service.description,
      performedByName: null,
    };
  });

  const inventoryOrderLines = inventoryLines.flatMap((line) => {
    const item = inventoryItems.find(
      (inventoryItem) => inventoryItem.id === line.id,
    )!;
    const unitPrice =
      isCompanyCar && company?.useCompanyMarkup
        ? companyInventoryUnitPrice(item, company.markupPercent)
        : Number(item.sellPrice.toString());

    const inventoryLine = {
      lineType: "inventory",
      serviceItemId: null,
      inventoryItemId: item.id,
      description: item.name,
      quantity: line.quantity,
      unitPrice,
      discountPercent: 0,
      complementary: false,
      lineTotal: orderLineTotal(line.quantity, unitPrice),
      category: item.category,
      salesCategory: item.salesCategory,
      costAtSale: item.cost,
      taxable: item.taxable,
      taxAmount: 0,
      notes:
        [item.brand, item.partNumber ? `Part # ${item.partNumber}` : null, item.tireSize]
          .filter(Boolean)
          .join(" | ") || null,
      performedByName: null,
    };

    return [inventoryLine, ...tireDisposalLines(item, line.quantity)];
  });

  const lineItems = [...serviceOrderLines, ...inventoryOrderLines];
  const invoiceTotals = calculateInvoiceTotals(lineItems);

  const invoice = await prisma.$transaction(async (tx) => {
    for (const line of inventoryLines) {
      await tx.inventoryItem.update({
        where: {
          id: line.id,
        },
        data: {
          quantity: {
            decrement: line.quantity,
          },
        },
      });
    }

    const customer = await tx.customer.create({
      data: {
        firstName: customerNameParts.firstName,
        lastName: customerNameParts.lastName,
        companyId,
        phone: "Not provided",
        notes: "Created from Quick Create Invoice.",
      },
    });

    const order = await tx.order.create({
      data: {
        orderNumber: createOrderNumber(),
        status: "completed",
        customerId: customer.id,
        companyId: isCompanyCar && company ? company.id : null,
        isCompanyCar,
        companyNameSnapshot: isCompanyCar && company ? company.name : null,
        companyMarkupPercent:
          isCompanyCar && company?.useCompanyMarkup
            ? company.markupPercent
            : null,
        createdBy: employee,
        quotedByEmployeeId,
        quoteAcceptedAt: new Date(),
        completedAt: new Date(),
        notes: "Created from Quick Create Invoice.",
        lineItems: {
          create: lineItems.map((lineItem) => ({
            lineType: lineItem.lineType,
            serviceItemId: lineItem.serviceItemId,
            inventoryItemId: lineItem.inventoryItemId,
            description: lineItem.description,
            quantity: lineItem.quantity,
            unitPrice: lineItem.unitPrice,
            discountPercent: lineItem.discountPercent,
            complementary: lineItem.complementary,
            lineTotal: lineItem.lineTotal,
            notes: lineItem.notes,
          })),
        },
      },
    });

    return tx.invoice.create({
      data: {
        invoiceNumber: await nextInvoiceNumber(tx),
        orderId: order.id,
        customerId: customer.id,
        status: "unpaid",
        subtotal: invoiceTotals.subtotal,
        taxableSubtotal: invoiceTotals.taxableSubtotal,
        taxRate: invoiceTotals.taxRate,
        taxAmount: invoiceTotals.taxAmount,
        total: invoiceTotals.total,
        lineItems: {
          create: lineItems.map((lineItem) => ({
            lineType: lineItem.lineType,
            serviceItemId: lineItem.serviceItemId,
            inventoryItemId: lineItem.inventoryItemId,
            category: lineItem.category,
            salesCategory: lineItem.salesCategory,
            description: lineItem.description,
            quantity: lineItem.quantity,
            unitPrice: lineItem.unitPrice,
            costAtSale: lineItem.costAtSale,
            discountPercent: lineItem.discountPercent,
            complementary: lineItem.complementary,
            taxable: lineItem.taxable,
            taxAmount: lineItem.taxAmount,
            lineTotal: lineItem.lineTotal,
            notes: lineItem.notes,
            performedByName: lineItem.performedByName,
          })),
        },
      },
    });
  });

  redirect(`/invoices/${invoice.id}?created=1`);
}

export async function markInvoicePaid(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const invoiceId = Number(formData.get("invoiceId"));
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  const paymentPurpose = validPaymentPurpose(
    String(formData.get("paymentPurpose") ?? ""),
  );

  if (!Number.isInteger(invoiceId) || !paymentMethod) {
    redirect(`/invoices/${invoiceId || ""}?error=payment`);
  }

  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    select: {
      id: true,
      status: true,
      paidAt: true,
      total: true,
      customerId: true,
    },
  });

  if (!invoice) {
    redirect(`/invoices/${invoiceId}?error=payment`);
  }

  if (invoice.status === "paid" && invoice.paidAt) {
    redirect(`/invoices/${invoice.id}?paid=1`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        status: "paid",
        paidAt: new Date(),
        paidByUsername: employee,
      },
    });

    const payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        amount: invoice.total,
        method: paymentMethod,
        purpose: paymentPurpose,
        receivedByUsername: employee,
      },
    });

    if (paymentPurpose !== "invoice") {
      await tx.customerAccountEntry.create({
        data: {
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          paymentId: payment.id,
          entryType:
            paymentPurpose === "account"
              ? "payment_on_account"
              : paymentPurpose,
          amount: invoice.total,
          description: `Payment recorded as ${paymentPurpose.replace("_", " ")}.`,
          createdBy: employee,
        },
      });
    }
  });

  redirect(`/invoices/${invoice.id}?paid=1`);
}

export async function updateCustomer(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const customerId = Number(formData.get("customerId"));
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const companyId = optionalIntegerValue(formData, "companyId");

  if (
    !Number.isInteger(customerId) ||
    !firstName ||
    !lastName ||
    !phone ||
    (companyId !== null && !Number.isInteger(companyId))
  ) {
    redirect(`/customers/${customerId || ""}/edit?error=customer`);
  }

  if (companyId !== null) {
    const company = await prisma.company.findUnique({
      where: {
        id: companyId,
      },
      select: {
        id: true,
      },
    });

    if (!company) {
      redirect(`/customers/${customerId}/edit?error=customer`);
    }
  }

  await prisma.customer.update({
    where: {
      id: customerId,
    },
    data: {
      companyId,
      firstName,
      lastName,
      phone,
      email: nullableValue(formData, "email"),
      address: nullableValue(formData, "address"),
      city: nullableValue(formData, "city"),
      state: nullableValue(formData, "state"),
      zip: nullableValue(formData, "zip"),
      preferredContactMethod: nullableValue(formData, "preferredContactMethod"),
      notes: nullableValue(formData, "customerNotes"),
    },
  });

  redirect(`/customers/${customerId}/edit?updated=1`);
}

export async function createCustomerAccountEntry(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const customerId = Number(formData.get("customerId"));
  const entryType = String(formData.get("entryType") ?? "").trim();
  const amount = Number(formData.get("amount"));

  if (
    !Number.isInteger(customerId) ||
    !validCustomerAccountEntryType(entryType) ||
    Number.isNaN(amount) ||
    amount <= 0
  ) {
    redirect(`/customers/${customerId || ""}/edit?error=account`);
  }

  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
    select: {
      id: true,
    },
  });

  if (!customer) {
    redirect(`/customers/${customerId}/edit?error=account`);
  }

  await prisma.customerAccountEntry.create({
    data: {
      customerId,
      entryType,
      amount,
      description: nullableValue(formData, "description"),
      createdBy: employee,
    },
  });

  redirect(`/customers/${customerId}/edit?accountUpdated=1`);
}

export async function addCustomerVehicle(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const customerId = Number(formData.get("customerId"));
  const year = String(formData.get("year") ?? "").trim();
  const make = String(formData.get("make") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const mileageValue = String(formData.get("mileage") ?? "").trim();
  const mileage = mileageValue ? Number(mileageValue) : null;

  if (
    !Number.isInteger(customerId) ||
    !year ||
    !make ||
    !model ||
    (mileage !== null && (!Number.isInteger(mileage) || mileage < 0))
  ) {
    redirect(`/customers/${customerId || ""}/edit?error=vehicle`);
  }

  await prisma.vehicle.create({
    data: {
      customerId,
      year,
      make,
      model,
      trim: nullableValue(formData, "trim"),
      vin: nullableValue(formData, "vin"),
      licensePlate: nullableValue(formData, "licensePlate"),
      plateState: nullableValue(formData, "plateState"),
      color: nullableValue(formData, "color"),
      mileage,
      engineSize: nullableValue(formData, "engineSize"),
      transmissionType: nullableValue(formData, "transmissionType"),
      transmissionDetails: nullableValue(formData, "transmissionDetails"),
      fuelType: nullableValue(formData, "fuelType"),
      driveType: nullableValue(formData, "driveType"),
      tireSize: nullableValue(formData, "tireSize"),
      notes: nullableValue(formData, "vehicleNotes"),
    },
  });

  redirect(`/customers/${customerId}/edit?vehicleAdded=1`);
}

export async function deleteInvoice(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const invoiceId = Number(formData.get("invoiceId"));

  if (!Number.isInteger(invoiceId)) {
    redirect(`/invoices/${invoiceId || ""}?error=delete`);
  }

  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    select: {
      id: true,
      orderId: true,
      lineItems: {
        where: {
          lineType: "inventory",
        },
        select: {
          inventoryItemId: true,
          quantity: true,
        },
      },
    },
  });

  if (!invoice) {
    redirect(`/invoices/${invoiceId}?error=delete`);
  }

  await prisma.$transaction(async (tx) => {
    // Return the sold inventory to stock so the cleared invoice does not leave
    // the on-hand count short.
    for (const lineItem of invoice.lineItems) {
      if (lineItem.inventoryItemId) {
        await tx.inventoryItem.update({
          where: {
            id: lineItem.inventoryItemId,
          },
          data: {
            quantity: {
              increment: Number(lineItem.quantity.toString()),
            },
          },
        });
      }
    }

    // Remove ledger entries tied to this invoice so they stop showing on
    // reports. Deleting the invoice alone would only null their reference and
    // leave them counted in the receipts summary.
    await tx.customerAccountEntry.deleteMany({
      where: {
        invoiceId: invoice.id,
      },
    });

    // Cascades remove the invoice line items and payments.
    await tx.invoice.delete({
      where: {
        id: invoice.id,
      },
    });

    // Cascades remove the order line items. Safe now that the invoice is gone.
    await tx.order.delete({
      where: {
        id: invoice.orderId,
      },
    });
  });

  redirect("/invoices?deleted=1");
}

export async function deleteCustomer(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const customerId = Number(formData.get("customerId"));

  if (!Number.isInteger(customerId)) {
    redirect(`/customers/${customerId || ""}/edit?error=delete`);
  }

  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
    select: {
      id: true,
      _count: {
        select: {
          orders: true,
          invoices: true,
          payments: true,
        },
      },
    },
  });

  if (!customer) {
    redirect(`/customers/${customerId}/edit?error=delete`);
  }

  // Customers with orders, invoices, or payments still hold financial history.
  // Those records must be cleared first (delete their invoices separately) so
  // we never silently wipe data that feeds the reports.
  if (
    customer._count.orders > 0 ||
    customer._count.invoices > 0 ||
    customer._count.payments > 0
  ) {
    redirect(`/customers/${customerId}/edit?error=history`);
  }

  // Vehicles and account entries are removed by the schema cascade.
  await prisma.customer.delete({
    where: {
      id: customerId,
    },
  });

  redirect("/customers/search?deleted=1");
}

function statementRangeDate(value: string, endOfDay: boolean) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

export async function createCompanyStatement(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const companyId = Number(formData.get("companyId"));
  const mode = String(formData.get("mode") ?? "all");
  const isRange = mode === "range";

  if (!Number.isInteger(companyId)) {
    redirect("/company-invoices?error=invalid");
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (!company) {
    redirect("/company-invoices?error=invalid");
  }

  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;

  if (isRange) {
    rangeStart = statementRangeDate(String(formData.get("start") ?? ""), false);
    rangeEnd = statementRangeDate(String(formData.get("end") ?? ""), true);

    if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) {
      redirect(`/company-invoices?error=range&companyId=${companyId}`);
    }
  }

  // Only bill company-car invoices that are still unpaid and not already on
  // another statement.
  const invoices = await prisma.invoice.findMany({
    where: {
      status: "unpaid",
      companyInvoiceId: null,
      order: {
        companyId,
        isCompanyCar: true,
      },
      ...(isRange
        ? { createdAt: { gte: rangeStart!, lte: rangeEnd! } }
        : {}),
    },
    select: {
      id: true,
      subtotal: true,
      taxAmount: true,
      total: true,
    },
  });

  if (invoices.length === 0) {
    redirect(`/company-invoices?error=none&companyId=${companyId}`);
  }

  const subtotal = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.subtotal.toString()),
    0,
  );
  const taxAmount = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.taxAmount.toString()),
    0,
  );
  const total = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total.toString()),
    0,
  );

  const statement = await prisma.$transaction(async (tx) => {
    const created = await tx.companyInvoice.create({
      data: {
        companyId,
        rangeStart,
        rangeEnd,
        subtotal,
        taxAmount,
        total,
        createdBy: employee,
      },
    });

    await tx.invoice.updateMany({
      where: {
        id: { in: invoices.map((invoice) => invoice.id) },
      },
      data: {
        companyInvoiceId: created.id,
      },
    });

    return created;
  });

  redirect(`/company-invoices/${statement.id}?created=1`);
}

export async function markCompanyStatementPaid(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const statementId = Number(formData.get("statementId"));
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();

  if (!Number.isInteger(statementId) || !paymentMethod) {
    redirect(`/company-invoices/${statementId || ""}?error=payment`);
  }

  const statement = await prisma.companyInvoice.findUnique({
    where: { id: statementId },
    select: {
      id: true,
      status: true,
      invoices: {
        select: {
          id: true,
          status: true,
          total: true,
          customerId: true,
        },
      },
    },
  });

  if (!statement) {
    redirect(`/company-invoices/${statementId}?error=payment`);
  }

  if (statement.status === "paid") {
    redirect(`/company-invoices/${statement.id}?paid=1`);
  }

  const paidAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.companyInvoice.update({
      where: { id: statement.id },
      data: {
        status: "paid",
        paidAt,
        paidByUsername: employee,
        paymentMethod,
      },
    });

    // Marking the statement paid pays every invoice on it, each with its own
    // payment record so the receipts/revenue reports stay accurate.
    for (const invoice of statement.invoices) {
      if (invoice.status === "paid") {
        continue;
      }

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "paid",
          paidAt,
          paidByUsername: employee,
        },
      });

      await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount: invoice.total,
          method: paymentMethod,
          purpose: "invoice",
          receivedByUsername: employee,
        },
      });
    }
  });

  redirect(`/company-invoices/${statement.id}?paid=1`);
}

export async function deleteCompanyStatement(formData: FormData) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const statementId = Number(formData.get("statementId"));

  if (!Number.isInteger(statementId)) {
    redirect(`/company-invoices/${statementId || ""}?error=delete`);
  }

  const statement = await prisma.companyInvoice.findUnique({
    where: { id: statementId },
    select: { id: true, status: true },
  });

  if (!statement) {
    redirect(`/company-invoices/${statementId}?error=delete`);
  }

  // A paid statement already recorded payments against its invoices; deleting
  // it would strand that money, so block it.
  if (statement.status === "paid") {
    redirect(`/company-invoices/${statement.id}?error=paidDelete`);
  }

  // The invoices' companyInvoiceId is set null by the schema, releasing them
  // back to be billed again.
  await prisma.companyInvoice.delete({
    where: { id: statement.id },
  });

  redirect("/company-invoices?deleted=1");
}
