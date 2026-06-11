export function parseItemWeight(weight: unknown): number | undefined {
  if (weight == null) return undefined;
  if (typeof weight === "number" && Number.isFinite(weight)) return weight;
  if (typeof weight === "string") {
    const parsed = Number(weight);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (typeof weight === "object") {
    if (
      "$numberDecimal" in weight &&
      typeof (weight as { $numberDecimal: unknown }).$numberDecimal === "string"
    ) {
      const parsed = Number(
        (weight as { $numberDecimal: string }).$numberDecimal,
      );
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    if ("toString" in weight && typeof weight.toString === "function") {
      const parsed = Number(weight.toString());
      return Number.isFinite(parsed) ? parsed : undefined;
    }
  }
  return undefined;
}

export class Item {
  id?: string;
  name?: string;
  userId?: string;
  description?: string;
  weight?: number;
  category?: string;
  isDefault?: boolean;
  constructor(data: Partial<Item> = {}) {
    Object.assign(this, data);
  }
}

interface ItemModal {
  id: string;
  name?: string;
  userId?: string;
  isDefault?: boolean;
  description?: string;
  weight?: number;
  category?: string;
}
