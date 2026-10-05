import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { UserManager } from "@/components/dashboard/UserManager";
import { requirePage } from "@/server/auth";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requirePage("users.manage");
  const db = await getDb();
  const users = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      isActive: schema.users.isActive,
      lastLoginAt: schema.users.lastLoginAt,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .orderBy(asc(schema.users.role), asc(schema.users.name));
  return (
    <>
      <PageHeader
        title="Users"
        description="Owners have full access. Cashiers can use the POS, see today's and open orders, take payments and print receipts."
      />
      <div className="px-4 py-8 sm:px-8">
        <UserManager users={users} currentUserId={me.id} />
      </div>
    </>
  );
}
