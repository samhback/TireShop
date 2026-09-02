import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateVehicle } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { VehicleFields } from "@/app/customers/VehicleFields";

type EditVehiclePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    updated?: string;
    error?: string;
  }>;
};

export default async function EditVehiclePage({
  params,
  searchParams,
}: EditVehiclePageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const { id } = await params;
  const vehicleId = Number(id);

  if (!Number.isInteger(vehicleId)) {
    notFound();
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: {
      id: vehicleId,
    },
    include: {
      customer: true,
    },
  });

  if (!vehicle) {
    notFound();
  }

  const query = await searchParams;

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <Link className="back-link" href={`/customers/${vehicle.customerId}/edit`}>
          Back to Customer
        </Link>

        <p className="eyebrow">Edit Vehicle</p>
        <h1>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h1>
        <p className="helper">
          Owned by {vehicle.customer.firstName} {vehicle.customer.lastName}.
        </p>

        {query?.updated === "1" ? (
          <p className="success">Vehicle updated.</p>
        ) : null}

        {query?.error === "vehicle" ? (
          <p className="error">Check the required vehicle fields.</p>
        ) : null}

        <form className="customer-form" action={updateVehicle}>
          <input name="vehicleId" type="hidden" value={vehicle.id} />

          <div className="form-section">
            <h2>Vehicle Details</h2>
            <div className="form-grid">
              <VehicleFields defaults={vehicle} />

              <div className="field form-grid-wide">
                <label htmlFor="vehicleNotes">Vehicle Notes</label>
                <textarea
                  defaultValue={vehicle.notes ?? ""}
                  id="vehicleNotes"
                  name="vehicleNotes"
                />
              </div>
            </div>
          </div>

          <button className="submit-button inventory-submit" type="submit">
            <span>Save Vehicle</span>
            <span className="button-mark" aria-hidden="true">
              +
            </span>
          </button>
        </form>
      </section>
    </main>
  );
}
