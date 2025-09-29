import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { verifyAuthentication, getTenantFilter, AuthErrors, createErrorResponse } from '../../../lib/tenant-middleware'

function toInt(value: string | null, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

import { logAudit } from '../../../lib/audit'

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

    const where = {
      ...getTenantFilter(user),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { invoiceNumber: { contains: search, mode: 'insensitive' as const } },
              { customer: { is: { name: { contains: search, mode: 'insensitive' as const } } } },
            ],
          }
        : {}),
    }

    const [total, invoices, totals, pendingCount, activeClients] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          issueDate: true,
          totalAmount: true,
          currency: true,
          camInvoiceUuid: true,
          verificationUrl: true,
          customer: { select: { id: true, name: true } },
        },
      }),
      prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: getTenantFilter(user),
      }),
      prisma.invoice.count({ where: { ...getTenantFilter(user), status: { in: ['DRAFT', 'SUBMITTED'] } } }),
      prisma.customer.count({ where: { ...getTenantFilter(user), invoices: { some: {} } } }),
    ])

    return NextResponse.json({
      success: true,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      invoices,
      stats: {
        totalInvoices: total,
        totalRevenue: totals._sum.totalAmount ?? 0,
        pendingInvoices: pendingCount,
        activeClients,
      },
    })
  } catch (error) {
    console.error('Invoices GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthentication(request)
    if (!user) {
      const err = createErrorResponse(AuthErrors.UNAUTHORIZED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    const body = await request.json()
    const { invoiceNumber, issueDate, dueDate, currency, customerId, paymentTerms, lineItems } = body || {}
    if (!invoiceNumber || !issueDate || !currency || !customerId || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Compute totals server-side
    type InItem = { description: string; quantity: number; unitPrice: number; taxScheme?: string }
    const items = (lineItems as InItem[]).map((li) => {
      const q = Number(li.quantity || 0)
      const p = Number(li.unitPrice || 0)
      const lineTotal = q * p
      const taxRate = li.taxScheme === 'VAT' ? 0.10 : 0
      const taxAmount = lineTotal * taxRate
      return { description: li.description, quantity: q, unitPrice: p, lineTotal, taxRate, taxAmount }
    })
    const subtotal = items.reduce((s, it) => s + it.lineTotal, 0)
    const taxAmount = items.reduce((s, it) => s + it.taxAmount, 0)
    const totalAmount = subtotal + taxAmount

    const created = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          tenantId: user.tenantId!,
          customerId,
          invoiceNumber,
          issueDate: new Date(issueDate),
          dueDate: dueDate ? new Date(dueDate) : null,
          currency,
          subtotal,
          taxAmount,
          totalAmount,
          notes: paymentTerms || null,
        },
      })
      await Promise.all(items.map((it) => tx.invoiceLineItem.create({ data: { invoiceId: inv.id, description: it.description, quantity: it.quantity, unitPrice: it.unitPrice, lineTotal: it.lineTotal, taxRate: it.taxRate, taxAmount: it.taxAmount } })))
      return inv
    })

    await logAudit({ userId: user.id, tenantId: user.tenantId!, action: 'CREATE', entityType: 'Invoice', entityId: created.id, description: `Created invoice ${invoiceNumber}`, request, metadata: { totalAmount } })

    return NextResponse.json({ success: true, id: created.id })
  } catch (error) {
    console.error('Invoices POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

