export const salesCategoryOptions = [
  { value: "parts", label: "Parts" },
  { value: "tires", label: "Tires" },
  { value: "labor", label: "Labor" },
  { value: "cores", label: "Cores" },
  { value: "sublet", label: "Sublet" },
  { value: "shop_supplies", label: "Shop Supplies" },
  { value: "hazardous_materials", label: "Hazardous Materials" },
  { value: "tire_disposal", label: "Tire Disposal" },
];

export function defaultInventorySalesCategory(category: string) {
  if (category === "tires") return "tires";
  if (category === "shop-supplies") return "shop_supplies";
  return "parts";
}

export function salesCategoryLabel(value: string | null | undefined) {
  return (
    salesCategoryOptions.find((category) => category.value === value)?.label ??
    "Parts"
  );
}
