import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import {
  verifyAuthentication,
  verifyTenantAdminRole,
  getTenantFilter,
  createErrorResponse,
  AuthErrors,
} from '../../../../lib/tenant-middleware'
import { logAudit } from '../../../../lib/audit'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        name: true,
        businessName: true,
        taxId: true,
        registrationNumber: true,
        email: true,
        phone: true,
        website: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        status: true,
        camInvoiceEndpointId: true,
        createdAt: true,
        camInvoiceStatus: true,

        updatedAt: true,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const [totalInvoices, sumAll, sumOutstanding] = await Promise.all([
      prisma.invoice.count({ where: { customerId: id } }),
      prisma.invoice.aggregate({ _sum: { totalAmount: true }, where: { customerId: id } }),
      prisma.invoice.aggregate({ _sum: { totalAmount: true }, where: { customerId: id, status: { in: ['SUBMITTED', 'ACCEPTED'] } } }),
    ])

    return NextResponse.json({
      success: true,
      customer,
      aggregates: {
        totalInvoices,
        totalRevenue: sumAll._sum.totalAmount ?? 0,
        outstanding: sumOutstanding._sum.totalAmount ?? 0,
      },
    })
  } catch (error) {
    console.error('Customer GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const user = await verifyTenantAdminRole(request)
    if (!user) {
      const err = createErrorResponse(AuthErrors.TENANT_ADMIN_REQUIRED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    const existing = await prisma.customer.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Enforce tenant access
    const tenantFilter = getTenantFilter(user)
    if (tenantFilter.tenantId && tenantFilter.tenantId !== existing.tenantId) {
      const err = createErrorResponse(AuthErrors.TENANT_ACCESS_DENIED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    const body = await request.json()

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        businessName: body.businessName ?? undefined,
        taxId: body.taxId ?? undefined,
        registrationNumber: body.registrationNumber ?? undefined,
        email: body.email ?? undefined,
        phone: body.phone ?? undefined,
        website: body.website ?? undefined,
        address: body.address ?? undefined,
        city: body.city ?? undefined,
        postalCode: body.postalCode ?? undefined,
        country: body.country ?? undefined,
        status: (body.status?.toUpperCase() as 'ACTIVE' | 'INACTIVE') ?? undefined,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        businessName: true,
        taxId: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        postalCode: true,
        camInvoiceStatus: true,

        country: true,
        status: true,
        updatedAt: true,
      },
    })

    await logAudit({
      userId: user.id,
      tenantId: existing.tenantId,
      action: 'UPDATE',
      entityType: 'Customer',
      entityId: updated.id,
      description: `Updated customer ${updated.name}`,
      request,
    })

    return NextResponse.json({ success: true, customer: updated })
  } catch (error) {
    console.error('Customer PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const user = await verifyTenantAdminRole(request)
    if (!user) {
      const err = createErrorResponse(AuthErrors.TENANT_ADMIN_REQUIRED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    const existing = await prisma.customer.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Enforce tenant access
    const tenantFilter = getTenantFilter(user)
    if (tenantFilter.tenantId && tenantFilter.tenantId !== existing.tenantId) {
      const err = createErrorResponse(AuthErrors.TENANT_ACCESS_DENIED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    const invoiceCount = await prisma.invoice.count({ where: { customerId: existing.id } })
    if (invoiceCount > 0) {
      return NextResponse.json({ error: 'Cannot delete customer with existing invoices' }, { status: 400 })
    }

    await prisma.customer.delete({ where: { id: existing.id } })

    await logAudit({
      userId: user.id,
      tenantId: existing.tenantId,
      action: 'DELETE',
      entityType: 'Customer',
      entityId: existing.id,
      description: `Deleted customer ${existing.name}`,
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Customer DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

