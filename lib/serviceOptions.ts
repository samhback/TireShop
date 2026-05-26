import {
  Activity,
  BatteryCharging,
  CircleDot,
  ClipboardCheck,
  Droplets,
  Gauge,
  Snowflake,
  Wrench,
} from "lucide-react";

export const serviceCategories = [
  {
    slug: "tires-wheels",
    label: "Tires & Wheels",
    description: "Mounting, balancing, rotations, flat repair, TPMS, and alignments.",
    icon: CircleDot,
  },
  {
    slug: "oil-fluids",
    label: "Oil & Fluids",
    description: "Oil changes, coolant, brake fluid, transmission fluid, and flushes.",
    icon: Droplets,
  },
  {
    slug: "brakes",
    label: "Brakes",
    description: "Pads, rotors, calipers, brake inspections, and brake fluid service.",
    icon: Gauge,
  },
  {
    slug: "diagnostics",
    label: "Diagnostics",
    description: "Check engine lights, electrical checks, charging, and drivability.",
    icon: Activity,
  },
  {
    slug: "battery-electrical",
    label: "Battery & Electrical",
    description: "Battery tests, replacements, alternators, starters, bulbs, and wiring.",
    icon: BatteryCharging,
  },
  {
    slug: "ac-heating",
    label: "A/C & Heating",
    description: "A/C checks, recharge, leak checks, blower, and heater diagnostics.",
    icon: Snowflake,
  },
  {
    slug: "maintenance",
    label: "Maintenance",
    description: "Inspections, belts, hoses, filters, tune-ups, and scheduled maintenance.",
    icon: ClipboardCheck,
  },
  {
    slug: "general-repair",
    label: "General Repair",
    description: "Suspension, steering, engine repair, custom labor, and miscellaneous work.",
    icon: Wrench,
  },
];

export const serviceCategoryOptions = serviceCategories.map((category) => ({
  value: category.slug,
  label: category.label,
}));

export const pricingMethodOptions = [
  {
    value: "flat",
    label: "Flat Price",
  },
  {
    value: "hourly",
    label: "Hourly Rate",
  },
];
