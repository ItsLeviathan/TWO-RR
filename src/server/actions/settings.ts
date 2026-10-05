"use server";

import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { settingsSchema } from "@/lib/validation";
import { requirePermission } from "../auth";
import { ok, toActionError, type ActionResult } from "../result";

export async function saveSettings(input: unknown): Promise<ActionResult<null>> {
  try {
    await requirePermission("settings.manage");
    const data = settingsSchema.parse(input);
    const db = await getDb();
    await db
      .insert(schema.businessSettings)
      .values({ id: 1, ...data })
      .onConflictDoUpdate({ target: schema.businessSettings.id, set: data });
    revalidatePath("/", "layout");
    return ok(null);
  } catch (error) {
    return toActionError(error, "Unable to save settings. Please try again.");
  }
}
