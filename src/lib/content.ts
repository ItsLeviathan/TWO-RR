import type { BusinessSettings } from "@/server/settings";

/**
 * Public "About" copy. The owner writes the real story in Admin → Settings → About; until then
 * these neutral lines (drawn only from the logo's own tagline) are shown — no invented history.
 */
export function aboutContent(s: Pick<BusinessSettings, "businessName" | "tagline" | "aboutHeadline" | "aboutStory" | "aboutMission">) {
  return {
    headline: s.aboutHeadline || `Welcome to ${s.businessName}`,
    story:
      s.aboutStory ||
      `${s.businessName} is a coffee shop built around a simple promise — ${s.tagline} Pull up a seat, take your time, and make the moment yours.`,
    mission: s.aboutMission || null,
  };
}
