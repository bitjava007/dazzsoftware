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

function buildMeasurementData(parsed: ReturnType<typeof measurementSchema.parse>) {
  return {
    profileName: parsed.profileName || null,
    chest: parsed.chest ?? null,
    waist: parsed.waist ?? null,
    hips: parsed.hips ?? null,
    shoulders: parsed.shoulders ?? null,
    armLength: parsed.armLength ?? null,
    neck: parsed.neck ?? null,
    shirtLength: parsed.shirtLength ?? null,
    trouserLength: parsed.trouserLength ?? null,
    dressLength: parsed.dressLength ?? null,
    wrist: parsed.wrist ?? null,
    thigh: parsed.thigh ?? null,
    knee: parsed.knee ?? null,
    ankle: parsed.ankle ?? null,
    inseam: parsed.inseam ?? null,
    notes: parsed.notes || null,
  };
}

function parseFormData(formData: FormData) {
  return {
    clientId: formData.get("clientId") as string,
    profileName: (formData.get("profileName") as string) || undefined,
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
    notes: (formData.get("notes") as string) || undefined,
  };
}

export async function createMeasurementAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const parsed = measurementSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const measurement = await prisma.measurement.create({
      data: {
        clientId: parsed.data.clientId,
        ...buildMeasurementData(parsed.data),
        createdById: user.id,
        updatedById: user.id,
      },
    });

    await createAuditLog({
      userId: user.id,
      tableName: "measurements",
      recordId: measurement.id,
      action: "create",
      newValues: parsed.data as Record<string, unknown>,
    });

    revalidatePath("/mesures");
    revalidatePath(`/clients/${parsed.data.clientId}`);
    return { success: true, measurement };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la création des mesures" };
  }
}

export async function updateMeasurementAction(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const raw = parseFormData(formData);
  const parsed = measurementSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const old = await prisma.measurement.findUnique({ where: { id } });
    const measurement = await prisma.measurement.update({
      where: { id },
      data: {
        ...buildMeasurementData(parsed.data),
        updatedById: user.id,
      },
    });

    await createAuditLog({
      userId: user.id,
      tableName: "measurements",
      recordId: id,
      action: "update",
      oldValues: old as Record<string, unknown>,
      newValues: parsed.data as Record<string, unknown>,
    });

    revalidatePath("/mesures");
    revalidatePath(`/clients/${parsed.data.clientId}`);
    return { success: true, measurement };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la modification des mesures" };
  }
}

export async function getMeasurements() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  return prisma.measurement.findMany({
    where: { deletedAt: null },
    include: { client: { select: { id: true, fullName: true } } },
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
