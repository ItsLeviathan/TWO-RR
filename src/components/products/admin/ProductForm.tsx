"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { ImageField } from "@/components/forms/ImageField";
import { Switch } from "@/components/ui/controls";
import { ErrorMessage } from "@/components/ui/states";
import { useToast } from "@/components/ui/Toast";
import { centsToInput, parsePesoToCents } from "@/lib/money";
import { deleteProducts, saveProduct } from "@/server/actions/products";
import type { AdminProduct } from "@/server/admin-queries";

type OptionRow = { key: string; id: string | null; groupName: string; name: string; price: string };
type AddonRow = { key: string; id: string | null; name: string; price: string; isAvailable: boolean };

const key = () => crypto.randomUUID();

export function ProductForm({
  product,
  categories,
  uploadsEnabled,
}: {
  product: AdminProduct | null;
  categories: { id: string; name: string }[];
  uploadsEnabled: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  const [price, setPrice] = useState(product ? centsToInput(product.priceCents) : "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [isAvailable, setIsAvailable] = useState(product?.isAvailable ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [trackInventory, setTrackInventory] = useState(product?.trackInventory ?? false);
  const [stock, setStock] = useState(String(product?.inventory?.quantity ?? 0));
  const [threshold, setThreshold] = useState(String(product?.inventory?.lowStockThreshold ?? 5));
  const [options, setOptions] = useState<OptionRow[]>(
    product?.options.map((o) => ({ key: o.id, id: o.id, groupName: o.groupName, name: o.name, price: centsToInput(o.priceDeltaCents) })) ?? [],
  );
  const [addons, setAddons] = useState<AddonRow[]>(
    product?.addons.map((a) => ({ key: a.id, id: a.id, name: a.name, price: centsToInput(a.priceCents), isAvailable: a.isAvailable })) ?? [],
  );
  const hasExistingStock = Boolean(product?.inventory);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const priceCents = parsePesoToCents(price);
    if (!name.trim()) errs.name = "Name is required.";
    if (priceCents === null) errs.priceCents = "Enter a valid price, e.g. 120 or 120.50.";
    if (!categoryId) errs.categoryId = "Choose a category.";
    const optionData = options.map((o, i) => {
      const cents = parsePesoToCents(o.price || "0");
      if (!o.groupName.trim() || !o.name.trim()) errs[`options.${i}`] = "Each option needs a group and a name.";
      if (cents === null) errs[`options.${i}`] = "Enter a valid extra price (0 for none).";
      return { id: o.id, groupName: o.groupName.trim(), name: o.name.trim(), priceDeltaCents: cents ?? 0 };
    });
    const addonData = addons.map((a, i) => {
      const cents = parsePesoToCents(a.price || "0");
      if (!a.name.trim()) errs[`addons.${i}`] = "Each add-on needs a name.";
      if (cents === null) errs[`addons.${i}`] = "Enter a valid add-on price.";
      return { id: a.id, name: a.name.trim(), priceCents: cents ?? 0, isAvailable: a.isAvailable };
    });
    const stockQty = Number(stock);
    const thresholdQty = Number(threshold);
    if (trackInventory && !hasExistingStock && (!Number.isInteger(stockQty) || stockQty < 0)) errs.stock = "Enter a whole number of 0 or more.";
    if (trackInventory && (!Number.isInteger(thresholdQty) || thresholdQty < 0)) errs.threshold = "Enter a whole number of 0 or more.";

    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      setError("Please fix the highlighted fields.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await saveProduct({
        id: product?.id ?? null,
        name,
        description,
        categoryId,
        priceCents,
        imageUrl,
        sku,
        isAvailable,
        isFeatured,
        trackInventory,
        stockQuantity: trackInventory ? stockQty : null,
        lowStockThreshold: trackInventory ? thresholdQty : 5,
        options: optionData,
        addons: addonData,
      });
      if (result.ok) {
        toast.show(product ? "Product saved" : "Product added");
        router.push("/admin/products");
      } else {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  function remove() {
    if (!product || !window.confirm(`Delete “${product.name}”? Past orders keep their history.`)) return;
    startTransition(async () => {
      const result = await deleteProducts([product.id]);
      if (result.ok) {
        toast.show("Product deleted");
        router.push("/admin/products");
      } else setError(result.error);
    });
  }

  const err = (k: string) => fieldErrors[k];

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_22rem]" noValidate>
      <div className="space-y-6">
        <section className="card space-y-5 p-6">
          <h2 className="display text-2xl">Details</h2>
          <div>
            <label htmlFor="name" className="label">
              Name
            </label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} aria-invalid={Boolean(err("name"))} />
            {err("name") && <p className="field-error">{err("name")}</p>}
          </div>
          <div>
            <label htmlFor="description" className="label">
              Description
            </label>
            <textarea id="description" className="input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} />
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="price" className="label">
                Price (₱)
              </label>
              <input
                id="price"
                className="input tabular-nums"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="120.00"
                aria-invalid={Boolean(err("priceCents"))}
              />
              {err("priceCents") && <p className="field-error">{err("priceCents")}</p>}
            </div>
            <div>
              <label htmlFor="category" className="label">
                Category
              </label>
              <select id="category" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sku" className="label">
                SKU <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <input id="sku" className="input" value={sku} onChange={(e) => setSku(e.target.value)} maxLength={40} />
              {err("sku") && <p className="field-error">{err("sku")}</p>}
            </div>
          </div>
          <ImageField
            id="product-image"
            label="Photo"
            value={imageUrl}
            onChange={setImageUrl}
            folder="products"
            uploadsEnabled={uploadsEnabled}
            previewName={name || "Product"}
          />
        </section>

        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="display text-2xl">Options</h2>
              <p className="text-sm text-ink-muted">Customers choose one per group — e.g. group “Size”: Regular, Large.</p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                setOptions((o) => [...o, { key: key(), id: null, groupName: o.at(-1)?.groupName ?? "Size", name: "", price: "0.00" }])
              }
            >
              <Plus className="h-4 w-4" /> Add option
            </button>
          </div>
          {options.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">No options — the product is sold as is.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {options.map((o, i) => (
                <li key={o.key}>
                  <div className="grid grid-cols-[1fr_1fr_7rem_auto] items-end gap-2">
                    <div>
                      <label className="label text-xs" htmlFor={`og-${o.key}`}>
                        Group
                      </label>
                      <input
                        id={`og-${o.key}`}
                        className="input"
                        value={o.groupName}
                        onChange={(e) => setOptions((rows) => rows.map((r) => (r.key === o.key ? { ...r, groupName: e.target.value } : r)))}
                      />
                    </div>
                    <div>
                      <label className="label text-xs" htmlFor={`on-${o.key}`}>
                        Option
                      </label>
                      <input
                        id={`on-${o.key}`}
                        className="input"
                        value={o.name}
                        placeholder="Large"
                        onChange={(e) => setOptions((rows) => rows.map((r) => (r.key === o.key ? { ...r, name: e.target.value } : r)))}
                      />
                    </div>
                    <div>
                      <label className="label text-xs" htmlFor={`op-${o.key}`}>
                        Extra (₱)
                      </label>
                      <input
                        id={`op-${o.key}`}
                        className="input tabular-nums"
                        inputMode="decimal"
                        value={o.price}
                        onChange={(e) => setOptions((rows) => rows.map((r) => (r.key === o.key ? { ...r, price: e.target.value } : r)))}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon text-danger-600"
                      onClick={() => setOptions((rows) => rows.filter((r) => r.key !== o.key))}
                      aria-label={`Remove option ${o.name || i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {err(`options.${i}`) && <p className="field-error">{err(`options.${i}`)}</p>}
                </li>
              ))}
            </ul>
          )}
          <p className="hint mt-3">The first option in each group is pre-selected.</p>
        </section>

        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="display text-2xl">Add-ons</h2>
              <p className="text-sm text-ink-muted">Optional extras customers can add, e.g. Extra Shot.</p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setAddons((a) => [...a, { key: key(), id: null, name: "", price: "0.00", isAvailable: true }])}
            >
              <Plus className="h-4 w-4" /> Add add-on
            </button>
          </div>
          {addons.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">No add-ons.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {addons.map((a, i) => (
                <li key={a.key}>
                  <div className="grid grid-cols-[1fr_7rem_auto_auto] items-end gap-2">
                    <div>
                      <label className="label text-xs" htmlFor={`an-${a.key}`}>
                        Add-on
                      </label>
                      <input
                        id={`an-${a.key}`}
                        className="input"
                        value={a.name}
                        placeholder="Extra Shot"
                        onChange={(e) => setAddons((rows) => rows.map((r) => (r.key === a.key ? { ...r, name: e.target.value } : r)))}
                      />
                    </div>
                    <div>
                      <label className="label text-xs" htmlFor={`ap-${a.key}`}>
                        Price (₱)
                      </label>
                      <input
                        id={`ap-${a.key}`}
                        className="input tabular-nums"
                        inputMode="decimal"
                        value={a.price}
                        onChange={(e) => setAddons((rows) => rows.map((r) => (r.key === a.key ? { ...r, price: e.target.value } : r)))}
                      />
                    </div>
                    <div className="pb-2.5">
                      <Switch
                        checked={a.isAvailable}
                        onChange={(v) => setAddons((rows) => rows.map((r) => (r.key === a.key ? { ...r, isAvailable: v } : r)))}
                        label={`${a.name || "Add-on"} available`}
                        srOnlyLabel
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon text-danger-600"
                      onClick={() => setAddons((rows) => rows.filter((r) => r.key !== a.key))}
                      aria-label={`Remove add-on ${a.name || i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {err(`addons.${i}`) && <p className="field-error">{err(`addons.${i}`)}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <section className="card space-y-4 p-6">
          <h2 className="display text-2xl">Visibility</h2>
          <Switch checked={isAvailable} onChange={setIsAvailable} label="Available to order" />
          <Switch checked={isFeatured} onChange={setIsFeatured} label="Feature on home page" />
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="display text-2xl">Inventory</h2>
          <Switch checked={trackInventory} onChange={setTrackInventory} label="Track stock for this product" />
          {trackInventory && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="stock" className="label">
                  {hasExistingStock ? "Current stock" : "Starting stock"}
                </label>
                <input
                  id="stock"
                  className="input tabular-nums"
                  inputMode="numeric"
                  value={stock}
                  onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))}
                  disabled={hasExistingStock}
                />
                {err("stock") && <p className="field-error">{err("stock")}</p>}
              </div>
              <div>
                <label htmlFor="threshold" className="label">
                  Low stock at
                </label>
                <input
                  id="threshold"
                  className="input tabular-nums"
                  inputMode="numeric"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value.replace(/\D/g, ""))}
                />
                {err("threshold") && <p className="field-error">{err("threshold")}</p>}
              </div>
              {hasExistingStock && <p className="hint col-span-2">Adjust stock on the Inventory page so sales are never overwritten.</p>}
            </div>
          )}
          {!trackInventory && <p className="hint">Untracked products never run out (good for made-to-order drinks).</p>}
        </section>

        <div className="space-y-3 xl:sticky xl:top-6">
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <button type="submit" className="btn btn-gold btn-lg w-full" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} {product ? "Save Changes" : "Add Product"}
          </button>
          {product && (
            <button type="button" className="btn btn-outline w-full text-danger-600" onClick={remove} disabled={pending}>
              <Trash2 className="h-4 w-4" /> Delete Product
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
