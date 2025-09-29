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

interface LogAuditParams {
  userId?: string | null
  tenantId?: string | null
  action: AuditAction
  entityType: string
  entityId?: string | null
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
      userId: params.userId || null,
      tenantId: params.tenantId || null,
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

