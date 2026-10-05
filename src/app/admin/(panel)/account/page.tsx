import { PageHeader } from "@/components/dashboard/PageHeader";
import { PasswordForm } from "@/components/forms/PasswordForm";
import { ROLE_LABEL } from "@/lib/permissions";
import { requirePage } from "@/server/auth";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const me = await requirePage("account.manageOwn");
  return (
    <>
      <PageHeader title="My account" />
      <div className="max-w-4xl space-y-8 px-4 py-8 sm:px-8">
        <section className="card grid gap-4 p-6 sm:grid-cols-3">
          <div>
            <p className="text-sm text-ink-muted">Name</p>
            <p className="font-semibold">{me.name}</p>
          </div>
          <div>
            <p className="text-sm text-ink-muted">Email</p>
            <p className="font-semibold">{me.email}</p>
          </div>
          <div>
            <p className="text-sm text-ink-muted">Role</p>
            <p className="font-semibold">{ROLE_LABEL[me.role]}</p>
          </div>
        </section>
        <PasswordForm />
        <p className="text-sm text-ink-muted">Changing your password signs you out on every other device.</p>
      </div>
    </>
  );
}
