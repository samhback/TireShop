import {
  Battery,
  CircleDot,
  Droplets,
  Filter,
  FlaskConical,
  Gauge,
  Lightbulb,
  Package,
  SprayCan,
  Wrench,
} from "lucide-react";

export const inventoryCategories = [
  {
    slug: "tires",
    label: "Tires",
    description: "Size, brand, model, quantity, cost each, and sell price each.",
    icon: CircleDot,
    fields: [
      { name: "tireSize", label: "Tire Size", placeholder: "LT275/70R18" },
      { name: "brand", label: "Brand", placeholder: "Cooper" },
      { name: "model", label: "Model", placeholder: "Discoverer AT3" },
      { name: "loadRating", label: "Load / Speed Rating", placeholder: "E / 125S" },
    ],
  },
  {
    slug: "oil",
    label: "Oil",
    description: "Oil weight, type, package size, and stock quantity.",
    icon: Droplets,
    fields: [
      { name: "oilWeight", label: "Oil Weight", placeholder: "5W-30" },
      { name: "oilType", label: "Oil Type", placeholder: "Full synthetic" },
      { name: "brand", label: "Brand", placeholder: "Mobil 1" },
      { name: "packageSize", label: "Package Size", placeholder: "Quart / 5 quart / bulk" },
    ],
  },
  {
    slug: "fluids",
    label: "Fluids",
    description: "Coolant, brake fluid, transmission fluid, washer fluid.",
    icon: FlaskConical,
    fields: [
      { name: "fluidType", label: "Fluid Type", placeholder: "Antifreeze / coolant" },
      { name: "specification", label: "Specification", placeholder: "Dex-Cool / DOT 3 / ATF+4" },
      { name: "brand", label: "Brand", placeholder: "Prestone" },
      { name: "packageSize", label: "Package Size", placeholder: "1 gallon" },
    ],
  },
  {
    slug: "filters",
    label: "Filters",
    description: "Oil, air, cabin, fuel, and transmission filters.",
    icon: Filter,
    fields: [
      { name: "filterType", label: "Filter Type", placeholder: "Oil filter" },
      { name: "partNumber", label: "Part Number", placeholder: "Required" },
      { name: "brand", label: "Brand", placeholder: "NAPA Gold" },
      { name: "fitment", label: "Fitment", placeholder: "Vehicle/application notes" },
    ],
  },
  {
    slug: "batteries",
    label: "Batteries",
    description: "Battery group, CCA, warranty, and stock quantity.",
    icon: Battery,
    fields: [
      { name: "batteryGroup", label: "Battery Group", placeholder: "Group 65" },
      { name: "cca", label: "CCA", placeholder: "850" },
      { name: "brand", label: "Brand", placeholder: "Interstate" },
      { name: "warranty", label: "Warranty", placeholder: "36 month" },
    ],
  },
  {
    slug: "brakes",
    label: "Brakes",
    description: "Pads, rotors, calipers, and brake hardware.",
    icon: Gauge,
    fields: [
      { name: "brakeComponent", label: "Brake Component", placeholder: "Pads / rotors / caliper" },
      { name: "position", label: "Position", placeholder: "Front / rear / left / right" },
      { name: "partNumber", label: "Part Number", placeholder: "Required" },
      { name: "fitment", label: "Fitment", placeholder: "Vehicle/application notes" },
    ],
  },
  {
    slug: "wipers-bulbs",
    label: "Wipers & Bulbs",
    description: "Wiper blades and common headlight/brake/turn bulbs.",
    icon: Lightbulb,
    fields: [
      { name: "itemType", label: "Item Type", placeholder: "Wiper blade / headlight bulb" },
      { name: "sizeOrBulbNumber", label: "Size / Bulb Number", placeholder: "22 inch / 9005" },
      { name: "brand", label: "Brand", placeholder: "Bosch" },
      { name: "fitment", label: "Fitment", placeholder: "Vehicle/application notes" },
    ],
  },
  {
    slug: "belts-hoses",
    label: "Belts & Hoses",
    description: "Serpentine belts, radiator hoses, heater hoses.",
    icon: Wrench,
    fields: [
      { name: "itemType", label: "Item Type", placeholder: "Serpentine belt / radiator hose" },
      { name: "partNumber", label: "Part Number", placeholder: "Required" },
      { name: "brand", label: "Brand", placeholder: "Gates" },
      { name: "fitment", label: "Fitment", placeholder: "Vehicle/application notes" },
    ],
  },
  {
    slug: "shop-supplies",
    label: "Shop Supplies",
    description: "Brake cleaner, grease, rags, gloves, valve stems, weights.",
    icon: SprayCan,
    fields: [
      { name: "supplyType", label: "Supply Type", placeholder: "Brake cleaner / valve stems" },
      { name: "unit", label: "Unit", placeholder: "Can / box / pack / each" },
      { name: "brand", label: "Brand", placeholder: "CRC" },
      { name: "storageLocation", label: "Storage Location", placeholder: "Shelf A / tire room" },
    ],
  },
  {
    slug: "other-part",
    label: "Other Part",
    description: "Alternators, starters, pumps, sensors, and special orders.",
    icon: Package,
    fields: [
      { name: "partType", label: "Part Type", placeholder: "Alternator / sensor / starter" },
      { name: "partNumber", label: "Part Number", placeholder: "Required if available" },
      { name: "brand", label: "Brand", placeholder: "ACDelco" },
      { name: "fitment", label: "Fitment", placeholder: "Vehicle/application notes" },
    ],
  },
] as const;

export type InventoryCategorySlug = (typeof inventoryCategories)[number]["slug"];

export function getInventoryCategory(slug: string) {
  return inventoryCategories.find((category) => category.slug === slug);
}
