import { NextRequest } from 'next/server'
import { prisma } from './prisma'

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'SUBMIT_INVOICE'
  | 'APPROVE_INVOICE'
  | 'REJECT_INVOICE'
  | 'CONFIGURE_PROVIDER'
  | 'CREATE_TENANT'
  | 'SUSPEND_TENANT'
  | 'ACTIVATE_TENANT'
  | 'WEBHOOK_RECEIVED'
  | 'SYNC_INVOICES'

interface LogAuditParams {
  userId: string | null // Optional for system actions
  tenantId: string | null // Optional for provider actions
  action: AuditAction // Required - use a default if needed
  entityType: string // e.g., "Invoice", "User", "Tenant", "Provider"
  entityId: string | null | undefined // Optional for system actions
  description: string
  metadata?: Record<string, any> | null
  request?: NextRequest
}

export async function logAudit(params: LogAuditParams) {
  const ipAddress = params.request?.headers.get('x-forwarded-for')
    || params.request?.headers.get('x-real-ip')
    || null
  const userAgent = params.request?.headers.get('user-agent') || null

  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      tenantId: params.tenantId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || null,
      description: params.description,
      metadata: params.metadata || undefined,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    },
  })
}

