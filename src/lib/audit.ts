import { prisma } from "./prisma";
import { AuditAction } from "@prisma/client";
import { headers } from "next/headers";

interface AuditParams {
  userId?: string;
  tableName: string;
  recordId: string;
  action: AuditAction;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export async function createAuditLog(params: AuditParams) {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? undefined;
    const userAgent = headersList.get("user-agent") ?? undefined;

    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        tableName: params.tableName,
        recordId: params.recordId,
        action: params.action,
        oldValues: params.oldValues ? JSON.parse(JSON.stringify(params.oldValues)) : undefined,
        newValues: params.newValues ? JSON.parse(JSON.stringify(params.newValues)) : undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Audit log creation failed:", error);
  }
}
