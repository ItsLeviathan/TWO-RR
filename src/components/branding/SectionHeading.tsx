import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ClockMark } from "./Ornaments";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "light",
  hour = 12,
  action,
  as: Tag = "h2",
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  tone?: "light" | "dark";
  hour?: number;
  action?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("flex flex-col gap-6 md:flex-row md:items-end md:justify-between", align === "center" && "items-center text-center md:flex-col md:items-center")}>
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        <p className={cn("eyebrow flex items-center gap-2.5", align === "center" && "justify-center", tone === "light" ? "text-gold-700" : "text-gold-400")}>
          <ClockMark hour={hour} className={cn("h-4 w-4", tone === "light" ? "text-gold-600" : "text-gold-400")} />
          {eyebrow}
        </p>
        <Tag className={cn("display mt-3 text-4xl sm:text-5xl", tone === "light" ? "text-ink" : "text-cream-50")}>{title}</Tag>
        {description && (
          <p className={cn("mt-4 text-base leading-relaxed sm:text-lg", tone === "light" ? "text-ink-soft" : "text-cream-200/80")}>{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
