export type PackingPlanItem = {
  title: string;
  category: string;
  essential: boolean;
  quantity: number;
  notes?: string;
};

export type PackingPlanInput = {
  trip: {
    title?: string;
    purpose?: string;
    destination?: string;
    origin?: string;
    startDate?: string | Date;
    endDate?: string | Date;
  };
  weatherSummary?: {
    summary?: string;
    temperatureC?: number;
    precipitationChance?: number;
  };
};

export function generatePackingPlan({ trip, weatherSummary }: PackingPlanInput) {
  const purpose = (trip.purpose ?? "vacation").toLowerCase();
  const destination = trip.destination ?? "your destination";
  const temperature = weatherSummary?.temperatureC ?? 23;
  const precipitationChance = weatherSummary?.precipitationChance ?? 0;
  const isHot = temperature >= 28;
  const isCold = temperature <= 12;
  const isRainy = precipitationChance >= 40;

  const baseItems: PackingPlanItem[] = [
    { title: "Travel documents", category: "Documents", essential: true, quantity: 1, notes: "Passport, ID, and booking confirmations" },
    { title: "Phone charger", category: "Electronics", essential: true, quantity: 1, notes: "Include power bank if travelling long hours" },
    { title: "Toiletries kit", category: "Toiletries", essential: true, quantity: 1, notes: "Sunscreen, toothbrush, and basic toiletries" },
    { title: "Water bottle", category: "Essentials", essential: true, quantity: 1 },
    { title: "Comfortable walking shoes", category: "Footwear", essential: true, quantity: 1 },
    { title: "Light jacket", category: "Clothing", essential: !isHot, quantity: 1, notes: isHot ? "Optional if evenings are cool" : "Useful for evenings and transit" },
    { title: "Socks and underwear", category: "Clothing", essential: true, quantity: 3 },
    { title: "Medications", category: "Health", essential: true, quantity: 1, notes: "Keep a small backup bag" },
  ];

  if (isHot) {
    baseItems.push({ title: "Sunglasses", category: "Accessories", essential: true, quantity: 1 });
    baseItems.push({ title: "Lightweight shirts", category: "Clothing", essential: true, quantity: 3, notes: "Quick-dry fabrics work best" });
    baseItems.push({ title: "Sunscreen", category: "Toiletries", essential: true, quantity: 1 });
  }

  if (isCold) {
    baseItems.push({ title: "Warm layer", category: "Clothing", essential: true, quantity: 1, notes: "Thermal or fleece layer" });
    baseItems.push({ title: "Warm cap", category: "Accessories", essential: true, quantity: 1 });
  }

  if (isRainy) {
    baseItems.push({ title: "Compact umbrella", category: "Accessories", essential: true, quantity: 1 });
    baseItems.push({ title: "Rain jacket", category: "Clothing", essential: true, quantity: 1 });
  }

  if (purpose.includes("beach") || purpose.includes("holiday") || purpose.includes("vacation")) {
    baseItems.push({ title: "Swimwear", category: "Leisure", essential: false, quantity: 1 });
    baseItems.push({ title: "Flip-flops", category: "Footwear", essential: false, quantity: 1 });
  }

  if (purpose.includes("business") || purpose.includes("work")) {
    baseItems.push({ title: "Laptop and charger", category: "Electronics", essential: true, quantity: 1, notes: "Keep work essentials close" });
    baseItems.push({ title: "Smart casual outfit", category: "Clothing", essential: true, quantity: 1 });
  }

  if (purpose.includes("adventure") || purpose.includes("trek") || purpose.includes("hiking")) {
    baseItems.push({ title: "Hiking shoes", category: "Footwear", essential: true, quantity: 1 });
    baseItems.push({ title: "Trail snacks", category: "Food", essential: false, quantity: 1 });
    baseItems.push({ title: "First aid pouch", category: "Health", essential: true, quantity: 1 });
  }

  const uniqueItems = Array.from(new Map(baseItems.map((item) => [`${item.category}:${item.title}`, item])).values());

  return {
    summary: `${destination} trip: pack for ${isHot ? "warm" : isCold ? "cold" : "variable"} weather${isRainy ? " with rain coverage" : ""}.`,
    items: uniqueItems,
    readinessHints: [
      "Confirm all essential documents and medication are in your carry bag.",
      "Check weather and pack an additional layer if evenings are cooler than daytime.",
      "Tidy your washing and charging plan before departure.",
    ],
  };
}
