import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  addCustomLineToOrder,
  acceptQuote,
  cancelApprovedOrder,
  completeOrder,
  attachVehicleToOrder,
  createVehicleForOrder,
  rejectQuote,
  removeOrderLineItem,
  updateOrderLineItemAdjustment,
} from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { VehicleFields } from "@/app/customers/VehicleFields";
import { OrderLineItemSearch } from "./OrderLineItemSearch";
import { PerformedBySelect } from "./PerformedBySelect";
import { QuoteLink } from "./QuoteLink";
import { QuotedBySelect } from "./QuotedBySelect";
import { ScrollPreserver } from "./ScrollPreserver";

type OrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    vehicleAttached?: string;
    vehicleAdded?: string;
    lineAdded?: string;
    lineRemoved?: string;
    lineUpdated?: string;
    performedByUpdated?: string;
    quoteAccepted?: string;
    quoteRejected?: string;
    quotedByUpdated?: string;
    orderCanceled?: string;
    vehicleRequired?: string;
    error?: string;
  }>;
};

function vehicleLabel(vehicle: {
  year: string;
  make: string;
  model: string;
  color: string | null;
  licensePlate: string | null;
  tireSize: string | null;
}) {
  return [
    vehicle.color,
    vehicle.year,
    vehicle.make,
    vehicle.model,
    vehicle.licensePlate ? `Plate ${vehicle.licensePlate}` : null,
    vehicle.tireSize ? `Tires ${vehicle.tireSize}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function money(value: { toString(): string } | number) {
  return Number(value.toString()).toFixed(2);
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: OrderDetailPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const { id } = await params;
  const orderId = Number(id);

  if (!Number.isInteger(orderId)) {
    notFound();
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      customer: {
        include: {
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
          },
        },
      },
      vehicle: {
        include: {
          _count: {
            select: {
              invoices: true,
            },
          },
        },
      },
      quotedByEmployee: true,
      lineItems: {
        include: {
          performedByEmployee: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const query = await searchParams;
  const hasQuotedBy = Boolean(order.quotedByEmployeeId);
  const employees = await prisma.employeeProfile.findMany({
    orderBy: {
      name: "asc",
    },
  });
  const subtotal = order.lineItems.reduce(
    (total, item) => total + Number(item.lineTotal.toString()),
    0,
  );
  const orderStatus = order.status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const reservedInventoryQuantities = order.lineItems.reduce<Record<number, number>>(
    (totals, item) => {
      if (item.inventoryItemId) {
        totals[item.inventoryItemId] =
          (totals[item.inventoryItemId] ?? 0) + Number(item.quantity.toString());
      }

      return totals;
    },
    {},
  );

  return (
    <main className="placeholder-shell">
      <ScrollPreserver />
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <Link className="back-link" href="/orders">
          Back to Orders
        </Link>

        <div className="order-workspace-header">
          <div>
            <p className="eyebrow">Order</p>
            <h1>{order.orderNumber}</h1>
            <p className="helper">
              Attach a vehicle, build the quote, then mark it accepted or rejected.
            </p>
          </div>

          <div className="order-status-panel">
            <span>Status</span>
            <strong>{orderStatus}</strong>
          </div>
        </div>

        {query?.vehicleAttached === "1" ? (
          <p className="success">Vehicle attached to order.</p>
        ) : null}

        {query?.vehicleAdded === "1" ? (
          <p className="success">Vehicle added and attached to order.</p>
        ) : null}

        {query?.lineAdded === "1" ? (
          <p className="success">Line item added.</p>
        ) : null}

        {query?.lineRemoved === "1" ? (
          <p className="success">Line item removed.</p>
        ) : null}

        {query?.lineUpdated === "1" ? (
          <p className="success">Line item updated.</p>
        ) : null}

        {query?.performedByUpdated === "1" ? (
          <p className="success">Performed By updated.</p>
        ) : null}

        {query?.quoteAccepted === "1" ? (
          <p className="success">Quote accepted. Order is approved and ready for work.</p>
        ) : null}

        {query?.quoteRejected === "1" ? (
          <p className="success">Quote rejected and reason saved.</p>
        ) : null}

        {query?.orderCanceled === "1" ? (
          <p className="success">Order canceled and reason saved.</p>
        ) : null}

        {query?.quotedByUpdated === "1" ? (
          <p className="success">Quoted By updated.</p>
        ) : null}

        {query?.error === "vehicle" ? (
          <p className="error">Choose or enter a valid vehicle for this order.</p>
        ) : null}

        {query?.error === "lineItem" ? (
          <p className="error">Check the line item details and try again.</p>
        ) : null}

        {query?.error === "vehicleRequired" ? (
          <p className="error">Attach a vehicle before adding services or inventory.</p>
        ) : null}

        {query?.error === "status" ? (
          <p className="error">Unable to update this quote status.</p>
        ) : null}

        {query?.error === "rejection" ? (
          <p className="error">Enter a reason before rejecting the quote.</p>
        ) : null}

        {query?.error === "cancellation" ? (
          <p className="error">Enter a reason before canceling the order.</p>
        ) : null}

        {query?.error === "quotedBy" ? (
          <p className="error">Choose a valid employee for Quoted By.</p>
        ) : null}

        {query?.error === "quotedByRequired" ? (
          <p className="error">Select Quoted By before generating, accepting, or canceling a quote.</p>
        ) : null}

        {query?.error === "performedBy" ? (
          <p className="error">Choose a valid employee for Performed By.</p>
        ) : null}

        {query?.error === "performedByRequired" ? (
          <p className="error">Every service line needs a Performed By employee before completing the order.</p>
        ) : null}

        {query?.error === "complete" ? (
          <p className="error">Order must be approved, have a vehicle, have Quoted By, and include line items before completion.</p>
        ) : null}

        {query?.error === "inventory" ? (
          <p className="error">Inventory quantity is no longer available for one or more line items.</p>
        ) : null}

        <section className="order-control-panel">
          <QuotedBySelect
            employees={employees.map((employeeProfile) => ({
              id: employeeProfile.id,
              name: employeeProfile.name,
            }))}
            orderId={order.id}
            quotedByEmployeeId={order.quotedByEmployeeId}
          />

          <div className="quote-status-actions">
            {order.status === "canceled" ? (
              <span className="protected-label">
                Order canceled. No further status actions available.
              </span>
            ) : order.status === "completed" ? (
              <span className="protected-label">
                Order completed. Invoice has been created.
              </span>
            ) : order.status === "approved" ? (
              <>
                <form action={completeOrder} data-preserve-scroll="true">
                  <input name="orderId" type="hidden" value={order.id} />
                  <button className="submit-button compact-submit-button" type="submit">
                    <span>Complete Order</span>
                  </button>
                </form>

                <details className="reject-quote-panel">
                  <summary>Cancel Order</summary>
                  <form action={cancelApprovedOrder} data-preserve-scroll="true">
                    <input name="orderId" type="hidden" value={order.id} />
                    <div className="field">
                      <label htmlFor="cancelReason">Reason</label>
                      <textarea
                        id="cancelReason"
                        name="reason"
                        placeholder="Customer changed their mind, repair no longer needed, authorization issue, etc."
                        required
                      />
                    </div>
                    <button className="delete-button" type="submit">
                      Save Cancellation
                    </button>
                  </form>
                </details>
              </>
            ) : (
              <>
                <form action={acceptQuote} data-preserve-scroll="true">
                  <input name="orderId" type="hidden" value={order.id} />
                  <button
                    className="submit-button compact-submit-button"
                    disabled={!hasQuotedBy}
                    type="submit"
                  >
                    <span>Quote Accepted</span>
                  </button>
                </form>

                <details className="reject-quote-panel">
                  <summary>Quote Rejected</summary>
                  <form action={rejectQuote} data-preserve-scroll="true">
                    <input name="orderId" type="hidden" value={order.id} />
                    <div className="field">
                      <label htmlFor="rejectReason">Reason</label>
                      <textarea
                        id="rejectReason"
                        name="reason"
                        placeholder="Price too high, customer declined, waiting on approval, etc."
                        required
                      />
                    </div>
                    <button className="delete-button" type="submit">
                      Save Rejection
                    </button>
                  </form>
                </details>
              </>
            )}
          </div>
        </section>

        {order.quoteRejectedAt && order.quoteRejectionReason ? (
          <div className="empty-state quote-rejection-note">
            <h2>Rejection Reason</h2>
            <p>{order.quoteRejectionReason}</p>
          </div>
        ) : null}

        {order.canceledAt && order.cancellationReason ? (
          <div className="empty-state quote-rejection-note">
            <h2>Cancellation Reason</h2>
            <p>{order.cancellationReason}</p>
          </div>
        ) : null}

        <div className="order-summary-grid">
          <article className="order-summary-card">
            <span>Customer</span>
            <h2>
              {order.customer.firstName} {order.customer.lastName}
            </h2>
            <p>
              {[order.customer.phone, order.customer.email].filter(Boolean).join(" | ")}
            </p>
          </article>

          <article className="order-summary-card">
            <span>Vehicle</span>
            {order.vehicle ? (
              <>
                <h2>{vehicleLabel(order.vehicle)}</h2>
                <p>Attached to this order.</p>
                {order.vehicle._count.invoices > 0 ? (
                  <Link
                    className="secondary-link-button inline-action-link"
                    href={`/vehicles/${order.vehicle.id}/history`}
                  >
                    Vehicle History
                  </Link>
                ) : null}
              </>
            ) : (
              <>
                <h2>No vehicle attached</h2>
                <p>Select an existing vehicle or add a new one below.</p>
              </>
            )}
          </article>
        </div>

        <div className="form-section compact-expandable-panel">
          <h2>Existing Vehicles</h2>
          {order.customer.vehicles.length > 0 ? (
            <div className="vehicle-card-list">
              {order.customer.vehicles.map((vehicle) => (
                <article className="customer-result-card" key={vehicle.id}>
                  <div className="customer-result-header">
                    <h3>{vehicleLabel(vehicle)}</h3>
                    <div className="vehicle-card-actions">
                      {vehicle._count.invoices > 0 ? (
                        <Link
                          className="secondary-link-button"
                          href={`/vehicles/${vehicle.id}/history`}
                        >
                          Vehicle History
                        </Link>
                      ) : null}
                      {order.vehicleId === vehicle.id ? (
                        <span className="attached-label">Attached</span>
                      ) : (
                        <form action={attachVehicleToOrder}>
                          <input name="orderId" type="hidden" value={order.id} />
                          <input name="vehicleId" type="hidden" value={vehicle.id} />
                          <button className="secondary-button" type="submit">
                            Attach Vehicle
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No saved vehicles</h2>
              <p>Add a vehicle below to attach it to this order.</p>
            </div>
          )}
        </div>

        <details className="expandable-panel">
          <summary>Add New Vehicle</summary>

          <form className="customer-form" action={createVehicleForOrder}>
            <input name="orderId" type="hidden" value={order.id} />
            <input name="customerId" type="hidden" value={order.customer.id} />

            <div className="form-section">
              <h2>Add Vehicle To Order</h2>
              <div className="form-grid">
                <VehicleFields idPrefix="orderVehicle" />

                <div className="field form-grid-wide">
                  <label htmlFor="vehicleNotes">Vehicle Notes</label>
                  <textarea id="vehicleNotes" name="vehicleNotes" />
                </div>
              </div>
            </div>

            <button className="submit-button inventory-submit" type="submit">
              <span>Add Vehicle</span>
              <span className="button-mark" aria-hidden="true">
                +
              </span>
            </button>
          </form>
        </details>

        <div className="form-section service-preview">
          <div className="section-heading-row">
            <h2>Quote Builder</h2>
            <QuoteLink canGenerate={hasQuotedBy} orderId={order.id} />
          </div>
          {order.lineItems.length > 0 ? (
            <div className="line-item-list">
              {order.lineItems.map((item) => (
                <article className="line-item-row" key={item.id}>
                  <div>
                    <span className="role-label">{item.lineType}</span>
                    <h3>{item.description}</h3>
                    {item.notes ? <p>{item.notes}</p> : null}
                    {item.lineType === "service" ? (
                      <PerformedBySelect
                        employees={employees.map((employeeProfile) => ({
                          id: employeeProfile.id,
                          name: employeeProfile.name,
                        }))}
                        lineItemId={item.id}
                        orderId={order.id}
                        performedByEmployeeId={item.performedByEmployeeId}
                      />
                    ) : null}
                  </div>

                  <div className="line-item-amounts">
                    <div className="line-price-block">
                      <span>
                        {money(item.quantity)} x ${money(item.unitPrice)}
                      </span>
                      {item.complementary ? (
                        <span className="line-badge">Complementary</span>
                      ) : Number(item.discountPercent.toString()) > 0 ? (
                        <span className="line-badge">
                          {money(item.discountPercent)}% off
                        </span>
                      ) : null}
                      <strong>${money(item.lineTotal)}</strong>
                    </div>
                    {["service", "inventory"].includes(item.lineType) ? (
                      <details className="line-adjustment-panel">
                        <summary>Adjust</summary>
                        <form
                          action={updateOrderLineItemAdjustment}
                          className="line-adjustment-form"
                          data-preserve-scroll="true"
                        >
                          <input name="orderId" type="hidden" value={order.id} />
                          <input name="lineItemId" type="hidden" value={item.id} />
                          <label>
                            Discount %
                            <input
                              defaultValue={money(item.discountPercent)}
                              max="100"
                              min="0"
                              name="discountPercent"
                              step="0.01"
                              type="number"
                            />
                          </label>
                          <label className="checkbox-line">
                            <input
                              defaultChecked={item.complementary}
                              name="complementary"
                              type="checkbox"
                            />
                            Complementary
                          </label>
                          <button className="secondary-button" type="submit">
                            Apply
                          </button>
                        </form>
                      </details>
                    ) : null}
                    <form action={removeOrderLineItem} data-preserve-scroll="true">
                      <input name="orderId" type="hidden" value={order.id} />
                      <input name="lineItemId" type="hidden" value={item.id} />
                      <button className="delete-button" type="submit">
                        Remove
                      </button>
                    </form>
                  </div>
                </article>
              ))}

              <div className="order-total-row">
                <span>Subtotal</span>
                <strong>${money(subtotal)}</strong>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h2>No line items yet</h2>
              <p>Add services, inventory, or custom charges to build the quote.</p>
            </div>
          )}

          {order.vehicle ? (
            <>
              <OrderLineItemSearch
                orderId={order.id}
                reservedInventoryQuantities={reservedInventoryQuantities}
              />

              <details className="expandable-panel">
                <summary>Add Custom Line</summary>

                <form
                  className="customer-form"
                  action={addCustomLineToOrder}
                  data-preserve-scroll="true"
                >
                  <input name="orderId" type="hidden" value={order.id} />

                  <div className="form-section">
                    <h2>Custom Charge</h2>
                    <div className="form-grid">
                      <div className="field form-grid-wide">
                        <label htmlFor="description">Description</label>
                        <input
                          id="description"
                          name="description"
                          placeholder="Custom labor, disposal fee, or outside part"
                          required
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="quantity">Quantity</label>
                        <input
                          defaultValue="1"
                          id="quantity"
                          min="0.01"
                          name="quantity"
                          step="0.01"
                          type="number"
                          required
                        />
                      </div>

                      <div className="field">
                        <label htmlFor="unitPrice">Unit Price</label>
                        <input
                          id="unitPrice"
                          min="0"
                          name="unitPrice"
                          step="0.01"
                          type="number"
                          required
                        />
                      </div>

                      <div className="field form-grid-wide">
                        <label htmlFor="notes">Notes</label>
                        <textarea id="notes" name="notes" />
                      </div>
                    </div>
                  </div>

                  <button className="submit-button inventory-submit" type="submit">
                    <span>Add Line</span>
                    <span className="button-mark" aria-hidden="true">
                      +
                    </span>
                  </button>
                </form>
              </details>
            </>
          ) : (
            <div className="empty-state">
              <h2>Attach a vehicle first</h2>
              <p>Services, inventory, and custom lines can be added after a vehicle is attached to the order.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
