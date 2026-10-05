"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { ImageField } from "@/components/forms/ImageField";
import { Segmented, Switch } from "@/components/ui/controls";
import { ErrorMessage } from "@/components/ui/states";
import { useToast } from "@/components/ui/Toast";
import { ORDER_TYPES, PAYMENT_METHODS, type OrderType, type PaymentMethod } from "@/db/schema";
import { ORDER_TYPE_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { saveSettings } from "@/server/actions/settings";
import type { BusinessSettings } from "@/server/settings";

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card grid gap-6 p-6 lg:grid-cols-[16rem_1fr]">
      <div>
        <h2 className="display text-2xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function SettingsForm({ settings, uploadsEnabled }: { settings: BusinessSettings; uploadsEnabled: boolean }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [s, setS] = useState({
    businessName: settings.businessName,
    tagline: settings.tagline,
    logoUrl: settings.logoUrl ?? "",
    address: settings.address ?? "",
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    openingHours: settings.openingHours ?? "",
    mapUrl: settings.mapUrl ?? "",
    facebookUrl: settings.facebookUrl ?? "",
    instagramUrl: settings.instagramUrl ?? "",
    tiktokUrl: settings.tiktokUrl ?? "",
    aboutHeadline: settings.aboutHeadline ?? "",
    aboutStory: settings.aboutStory ?? "",
    aboutMission: settings.aboutMission ?? "",
    receiptHeader: settings.receiptHeader ?? "",
    receiptFooter: settings.receiptFooter,
    receiptShowAddress: settings.receiptShowAddress,
    receiptShowPhone: settings.receiptShowPhone,
    receiptWidthMm: settings.receiptWidthMm as 58 | 80,
    paymentMethods: settings.paymentMethods,
    orderTypes: settings.orderTypes,
    onlineOrderingEnabled: settings.onlineOrderingEnabled,
    posDefaultStatus: settings.posDefaultStatus as "completed" | "preparing" | "pending",
  });
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => setS((prev) => ({ ...prev, [k]: v }));

  const text = (k: keyof typeof s, label: string, opts: { textarea?: boolean; placeholder?: string; hint?: string; max?: number; type?: string } = {}) => {
    const id = `set-${k}`;
    const props = {
      id,
      className: "input",
      value: s[k] as string,
      placeholder: opts.placeholder,
      maxLength: opts.max,
      "aria-invalid": Boolean(fieldErrors[k]),
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value as never),
    };
    return (
      <div>
        <label htmlFor={id} className="label">
          {label}
        </label>
        {opts.textarea ? <textarea {...props} rows={4} /> : <input {...props} type={opts.type ?? "text"} />}
        {fieldErrors[k] ? <p className="field-error">{fieldErrors[k]}</p> : opts.hint ? <p className="hint mt-1">{opts.hint}</p> : null}
      </div>
    );
  };

  function toggleIn<T extends string>(list: T[], value: T, on: boolean, order: readonly T[]): T[] {
    const next = on ? [...new Set([...list, value])] : list.filter((x) => x !== value);
    return order.filter((x) => next.includes(x));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveSettings(s);
      if (result.ok) {
        setFieldErrors({});
        toast.show("Settings saved");
      } else {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Section title="Brand" description="Shown across the website, POS and receipts.">
        <div className="grid gap-5 sm:grid-cols-2">
          {text("businessName", "Business name", { max: 80 })}
          {text("tagline", "Tagline", { max: 120 })}
        </div>
        <ImageField
          id="logo"
          label="Logo"
          value={s.logoUrl}
          onChange={(v) => set("logoUrl", v)}
          folder="brand"
          uploadsEnabled={uploadsEnabled}
          previewName={s.businessName}
        />
        <p className="hint -mt-2">Leave empty to use the supplied TWO RR clock logo.</p>
      </Section>

      <Section title="Location & contact" description="Only what you enter here is shown. Nothing is filled in automatically.">
        {text("address", "Address", { textarea: true, max: 300 })}
        {text("openingHours", "Opening hours", { textarea: true, max: 400, placeholder: "Mon–Fri 7:00 AM – 9:00 PM" })}
        <div className="grid gap-5 sm:grid-cols-2">
          {text("phone", "Phone", { max: 40, type: "tel" })}
          {text("email", "Email", { max: 120, type: "email" })}
        </div>
        {text("mapUrl", "Map link", { placeholder: "https://maps.google.com/…", hint: "Used for the “Get Directions” button." })}
        <div className="grid gap-5 sm:grid-cols-3">
          {text("facebookUrl", "Facebook", { placeholder: "https://facebook.com/…" })}
          {text("instagramUrl", "Instagram", { placeholder: "https://instagram.com/…" })}
          {text("tiktokUrl", "TikTok", { placeholder: "https://tiktok.com/@…" })}
        </div>
      </Section>

      <Section title="About page" description="Your story, in your words. Until you write it, the site shows a short neutral introduction.">
        {text("aboutHeadline", "Headline", { max: 140, placeholder: "Welcome to TWO RR" })}
        {text("aboutStory", "Story", { textarea: true, max: 3000 })}
        {text("aboutMission", "Mission", { textarea: true, max: 1000 })}
      </Section>

      <Section title="Receipts" description="Printed from the POS and order pages through your browser's print dialog.">
        <fieldset>
          <legend className="label">Paper width</legend>
          <Segmented
            name="receipt-width"
            value={String(s.receiptWidthMm) as "58" | "80"}
            onChange={(v) => set("receiptWidthMm", Number(v) as 58 | 80)}
            options={[
              { value: "58", label: "58 mm" },
              { value: "80", label: "80 mm" },
            ]}
            className="max-w-xs"
          />
        </fieldset>
        {text("receiptHeader", "Extra header line", { max: 200, hint: "Optional, e.g. a TIN or permit number if you need it printed." })}
        {text("receiptFooter", "Footer message", { max: 200 })}
        <div className="flex flex-wrap gap-6">
          <Switch checked={s.receiptShowAddress} onChange={(v) => set("receiptShowAddress", v)} label="Print address" />
          <Switch checked={s.receiptShowPhone} onChange={(v) => set("receiptShowPhone", v)} label="Print phone" />
        </div>
      </Section>

      <Section title="Payments" description="Methods offered at checkout and in the POS. Payments are recorded by staff; no online payment is processed.">
        <div className="flex flex-wrap gap-6">
          {PAYMENT_METHODS.map((m) => (
            <Switch
              key={m}
              checked={s.paymentMethods.includes(m)}
              onChange={(on) => set("paymentMethods", toggleIn<PaymentMethod>(s.paymentMethods, m, on, PAYMENT_METHODS))}
              label={PAYMENT_METHOD_LABEL[m]}
            />
          ))}
        </div>
        {fieldErrors.paymentMethods && <p className="field-error">{fieldErrors.paymentMethods}</p>}
        <p className="hint">Currency: Philippine Peso (₱). All prices are stored and charged in pesos.</p>
      </Section>

      <Section title="Ordering">
        <Switch checked={s.onlineOrderingEnabled} onChange={(v) => set("onlineOrderingEnabled", v)} label="Accept online orders from the website" />
        <div>
          <p className="label">Order types</p>
          <div className="flex flex-wrap gap-6">
            {ORDER_TYPES.map((t) => (
              <Switch
                key={t}
                checked={s.orderTypes.includes(t)}
                onChange={(on) => set("orderTypes", toggleIn<OrderType>(s.orderTypes, t, on, ORDER_TYPES))}
                label={ORDER_TYPE_LABEL[t]}
              />
            ))}
          </div>
          {fieldErrors.orderTypes && <p className="field-error">{fieldErrors.orderTypes}</p>}
        </div>
        <fieldset>
          <legend className="label">Status of new POS sales</legend>
          <Segmented
            name="pos-status"
            value={s.posDefaultStatus}
            onChange={(v) => set("posDefaultStatus", v)}
            options={[
              { value: "completed", label: "Completed" },
              { value: "preparing", label: "Preparing" },
              { value: "pending", label: "Pending" },
            ]}
            className="max-w-md"
          />
          <p className="hint mt-2">Choose “Preparing” if your team marks drinks ready from the Orders page.</p>
        </fieldset>
      </Section>

      <div className="sticky bottom-4 z-10 flex flex-col items-end gap-3">
        {error && <ErrorMessage className="w-full">{error}</ErrorMessage>}
        <button type="submit" className="btn btn-gold btn-lg shadow-lg" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save Settings
        </button>
      </div>
    </form>
  );
}
