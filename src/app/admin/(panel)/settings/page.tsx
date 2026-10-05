import { PageHeader } from "@/components/dashboard/PageHeader";
import { SettingsForm } from "@/components/forms/SettingsForm";
import { requirePage } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { isUploadConfigured } from "@/server/storage";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePage("settings.manage");
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Settings" description="Business details, website content, receipts, payments and ordering." />
      <div className="space-y-8 px-4 py-8 sm:px-8">
        <SettingsForm settings={settings} uploadsEnabled={isUploadConfigured()} />
      </div>
    </>
  );
}
