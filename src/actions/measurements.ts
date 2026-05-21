"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/audit";

const measurementSchema = z.object({
  clientId: z.string().min(1, "Sélectionnez un client"),
  profileName: z.string().optional(),
  chest: z.coerce.number().positive().optional(),
  waist: z.coerce.number().positive().optional(),
  hips: z.coerce.number().positive().optional(),
  shoulders: z.coerce.number().positive().optional(),
  armLength: z.coerce.number().positive().optional(),
  neck: z.coerce.number().positive().optional(),
  shirtLength: z.coerce.number().positive().optional(),
  trouserLength: z.coerce.number().positive().optional(),
  dressLength: z.coerce.number().positive().optional(),
  wrist: z.coerce.number().positive().optional(),
  thigh: z.coerce.number().positive().optional(),
  knee: z.coerce.number().positive().optional(),
  ankle: z.coerce.number().positive().optional(),
  inseam: z.coerce.number().positive().optional(),
  notes: z.string().optional(),
});

function parseOptionalDecimal(value: FormDataEntryValue | null) {
  if (!value || value === "") return undefined;
  const num = parseFloat(value as string);
  return isNaN(num) ? undefined : num;
}

export async function createMeasurementAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const parsed = measurementSchema.safeParse({
    clientId: formData.get("clientId"),
    profileName: formData.get("profileName") || undefined,
    chest: parseOptionalDecimal(formData.get("chest")),
    waist: parseOptionalDecimal(formData.get("waist")),
    hips: parseOptionalDecimal(formData.get("hips")),
    shoulders: parseOptionalDecimal(formData.get("shoulders")),
    armLength: parseOptionalDecimal(formData.get("armLength")),
    neck: parseOptionalDecimal(formData.get("neck")),
    shirtLength: parseOptionalDecimal(formData.get("shirtLength")),
    trouserLength: parseOptionalDecimal(formData.get("trouserLength")),
    dressLength: parseOptionalDecimal(formData.get("dressLength")),
    wrist: parseOptionalDecimal(formData.get("wrist")),
    thigh: parseOptionalDecimal(formData.get("thigh")),
    knee: parseOptionalDecimal(formData.get("knee")),
    ankle: parseOptionalDecimal(formData.get("ankle")),
    inseam: parseOptionalDecimal(formData.get("inseam")),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const measurement = await prisma.measurement.create({
      data: {
        ...parsed.data,
        createdById: user.id,
        updatedById: user.id,
      },
    });

    await createAuditLog({
      userId: user.id,
      tableName: "measurements",
      recordId: measurement.id,
      action: "create",
      newValues: parsed.data,
    });

    revalidatePath("/mesures");
    revalidatePath(`/clients/${parsed.data.clientId}`);
    return { success: true, measurement };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la création des mesures" };
  }
}

export async function getMeasurements() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  return prisma.measurement.findMany({
    where: { deletedAt: null },
    include: {
      client: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteMeasurementAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  try {
    await prisma.measurement.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: user.id },
    });
    revalidatePath("/mesures");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la suppression" };
  }
}
