/**
 * Pure pricing logic shared by the browser (for display) and the server (authoritative).
 * The server always recomputes prices from database values; client totals are only previews.
 */

export type PricedOption = { id: string; groupName: string; name: string; priceDeltaCents: number };
export type PricedAddon = { id: string; name: string; priceCents: number; isAvailable: boolean };

export type PricedProduct = {
  priceCents: number;
  options: PricedOption[];
  addons: PricedAddon[];
};

export type OptionGroup = { name: string; options: PricedOption[] };

/** Groups options by `groupName`, preserving the incoming (sorted) order. */
export function groupOptions(options: PricedOption[]): OptionGroup[] {
  const groups = new Map<string, PricedOption[]>();
  for (const option of options) {
    const list = groups.get(option.groupName) ?? [];
    list.push(option);
    groups.set(option.groupName, list);
  }
  return [...groups.entries()].map(([name, opts]) => ({ name, options: opts }));
}

/** The first option of every group — used as the pre-selected default. */
export function defaultOptionIds(options: PricedOption[]): string[] {
  return groupOptions(options).map((g) => g.options[0]!.id);
}

export type SelectionResult =
  | { ok: true; unitPriceCents: number; options: PricedOption[]; addons: PricedAddon[] }
  | { ok: false; error: string };

/**
 * Validates a selection (exactly one option per group, only known & available add-ons)
 * and returns the unit price in centavos.
 */
export function resolveSelection(
  product: PricedProduct,
  optionIds: string[],
  addonIds: string[],
): SelectionResult {
  const groups = groupOptions(product.options);
  const chosenOptions: PricedOption[] = [];

  const uniqueOptionIds = new Set(optionIds);
  if (uniqueOptionIds.size !== optionIds.length) return { ok: false, error: "Duplicate option selected." };

  for (const group of groups) {
    const picked = group.options.filter((o) => uniqueOptionIds.has(o.id));
    if (picked.length !== 1) return { ok: false, error: `Please choose one ${group.name.toLowerCase()}.` };
    chosenOptions.push(picked[0]!);
  }
  if (chosenOptions.length !== uniqueOptionIds.size) return { ok: false, error: "Invalid option selected." };

  const uniqueAddonIds = new Set(addonIds);
  if (uniqueAddonIds.size !== addonIds.length) return { ok: false, error: "Duplicate add-on selected." };
  const chosenAddons = product.addons.filter((a) => uniqueAddonIds.has(a.id));
  if (chosenAddons.length !== uniqueAddonIds.size) return { ok: false, error: "Invalid add-on selected." };
  const unavailable = chosenAddons.find((a) => !a.isAvailable);
  if (unavailable) return { ok: false, error: `${unavailable.name} is currently unavailable.` };

  const unitPriceCents =
    product.priceCents +
    chosenOptions.reduce((sum, o) => sum + o.priceDeltaCents, 0) +
    chosenAddons.reduce((sum, a) => sum + a.priceCents, 0);

  return { ok: true, unitPriceCents, options: chosenOptions, addons: chosenAddons };
}

/** Human-readable summary of a selection, e.g. "Large · Extra Shot, Oat Milk". */
export function describeSelection(options: { name: string }[], addons: { name: string }[]): string {
  const parts: string[] = [];
  if (options.length) parts.push(options.map((o) => o.name).join(", "));
  if (addons.length) parts.push(addons.map((a) => a.name).join(", "));
  return parts.join(" · ");
}

export const MAX_LINE_QUANTITY = 99;
export const MAX_ORDER_LINES = 50;
