import Link from "next/link";
import { redirect } from "next/navigation";
import { PackagePlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { ServiceList } from "./ServiceList";

type ServicesPageProps = {
  searchParams?: Promise<{
    updated?: string;
  }>;
};

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const params = await searchParams;

  const services = await prisma.serviceItem.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    take: 50,
  });

  const serviceList = services.map((service) => ({
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

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <p className="eyebrow">Services</p>
        <h1>Services</h1>
        <p className="helper">
          Set up shop services with flat prices or hourly labor rates for future invoices.
        </p>

        {params?.updated === "1" ? (
          <p className="success">Service updated.</p>
        ) : null}

        <div className="section-grid section-grid-single">
          <Link className="section-card" href="/services/add">
            <span className="dashboard-icon" aria-hidden="true">
              <PackagePlus size={26} strokeWidth={2.2} />
            </span>
            <span className="dashboard-card-text">
              <strong>Add Service</strong>
              <span>Create a service with pricing, labor estimate, and notes.</span>
            </span>
          </Link>
        </div>

        <div className="form-section service-preview">
          <h2>Current Services</h2>
          <ServiceList services={serviceList} />
        </div>
      </section>
    </main>
  );
}
