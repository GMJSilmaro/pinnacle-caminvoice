import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import {
  verifyAuthentication,
  verifyTenantAdminRole,
  getTenantFilter,
  AuthErrors,
  createErrorResponse,
} from '../../../lib/tenant-middleware'
import { logAudit } from '../../../lib/audit'

function toInt(value: string | null, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthentication(request)
    if (!user) {
      const err = createErrorResponse(AuthErrors.UNAUTHORIZED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    const { searchParams } = new URL(request.url)
    const page = toInt(searchParams.get('page'), 1)
    const pageSize = toInt(searchParams.get('pageSize'), 10)
    const search = searchParams.get('search')?.trim()
    const status = searchParams.get('status')?.toUpperCase()

    const where: any = {
      ...getTenantFilter(user),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { debitNoteNumber: { contains: search, mode: 'insensitive' as const } },
              { camInvoiceUuid: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const client = prisma as any
    const [total, notes] = await Promise.all([
      client.debitNote.count({ where }),
      client.debitNote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          tenantId: true,
          customerId: true,
          debitNoteNumber: true,
          status: true,
          issueDate: true,
          subtotal: true,
          taxAmount: true,
          totalAmount: true,
          currency: true,
          camInvoiceUuid: true,
          camInvoiceStatus: true,
          verificationUrl: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      debitNotes: notes,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('DebitNotes GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyTenantAdminRole(request)
    if (!user) {
      const err = createErrorResponse(AuthErrors.TENANT_ADMIN_REQUIRED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    const body = await request.json()
    const {
      debitNoteNumber,
      issueDate,
      currency,
      customerId,
      originalInvoiceId,
      subtotal,
      taxAmount,
      totalAmount,
      reason,
      notes,
      status,
      tenantId,
    } = body || {}

    if (!debitNoteNumber || !issueDate || !currency || !customerId || subtotal == null || taxAmount == null || totalAmount == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const targetTenantId = user.role === 'PROVIDER' && tenantId ? tenantId : user.tenantId
    if (!targetTenantId) return NextResponse.json({ error: 'No tenant specified' }, { status: 400 })

    const client2 = prisma as any
    const created = await client2.debitNote.create({
      data: ({
        tenantId: targetTenantId,
        customerId,
        originalInvoiceId: originalInvoiceId || null,
        debitNoteNumber,
        type: 'DEBIT_NOTE',
        status: (status?.toUpperCase() as 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED') || 'DRAFT',
        issueDate: new Date(issueDate),
        subtotal,
        taxAmount,
        totalAmount,
        currency,
        reason: reason || null,
        notes: notes || null,
      } as any),
      select: {
        id: true,
        debitNoteNumber: true,
        status: true,
        issueDate: true,
        totalAmount: true,
        currency: true,
        createdAt: true,
      },
    })

    await logAudit({
      userId: user.id,
      tenantId: targetTenantId,
      action: 'CREATE',
      entityType: 'DebitNote',
      entityId: created.id,
      description: `Created debit note ${created.debitNoteNumber}`,
      request,
    })

    return NextResponse.json({ success: true, debitNote: created })
  } catch (error) {
    console.error('DebitNotes POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

