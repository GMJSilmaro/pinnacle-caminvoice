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
import { ensureProviderAccessToken } from '../../../lib/providerToken'
import { getMemberDetailByEndpoint } from '../../../lib/caminvoice'


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
              { name: { contains: search, mode: 'insensitive' as const } },
              { businessName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { taxId: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const client = prisma as any
    const [total, customers] = await Promise.all([
      client.customer.count({ where }),
      client.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          tenantId: true,
          name: true,
          businessName: true,
          taxId: true,
          registrationNumber: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          postalCode: true,
          country: true,
          status: true,
          camInvoiceStatus: true,

          createdAt: true,
          updatedAt: true,
        },
      }),
    ])

    // Aggregate invoice counts and revenue per customer for the page results
    const customerIds = customers.map((c: any) => c.id)
    let aggregates: Record<string, { invoiceCount: number; totalRevenue: number }> = {}
    if (customerIds.length > 0) {
      const grouped = await prisma.invoice.groupBy({
        by: ['customerId'],
        _count: { _all: true },
        _sum: { totalAmount: true },
        where: { customerId: { in: customerIds } },
      })
      aggregates = Object.fromEntries(
        grouped.map((g: any) => [
          g.customerId,
          { invoiceCount: Number(g._count?._all || 0), totalRevenue: Number(g._sum?.totalAmount || 0) },
        ])
      )
    }

    const enriched = customers.map((c: any) => ({
      ...c,
      invoiceCount: aggregates[c.id]?.invoiceCount || 0,
      totalRevenue: aggregates[c.id]?.totalRevenue || 0,
    }))

    // Fetch tenant currency to help UI display amounts consistently
    let currencyCode: string | undefined
    try {
      const tenant = user.tenantId ? await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { currency: true } }) : null
      currencyCode = tenant?.currency
    } catch {}

    return NextResponse.json({
      success: true,
      customers: enriched,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      currency: currencyCode,
    })
  } catch (error) {
    console.error('Customers GET error:', error)
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
      name,
      businessName,
      taxId,
      tin,
      registrationNumber,
      email,
      phone,
      website,
      address,
      city,
      postalCode,
      country,
      status,
      tenantId,
      camInvoiceEndpointId,
      companyNameKh,
    } = body || {}

    if (!name || !businessName || !(taxId || camInvoiceEndpointId) || !address || !city) {
      return NextResponse.json({ error: 'Name, business name, endpoint ID (as tax ID), address and city are required' }, { status: 400 })
    }

    const targetTenantId =
      user.role === 'PROVIDER' && tenantId ? tenantId : user.tenantId

    if (!targetTenantId) {
      return NextResponse.json({ error: 'No tenant specified' }, { status: 400 })
    }
    // Derive CamInvoice status during creation
    let camInvoiceStatusFinal: 'registered' | 'not_registered' | 'pending' | 'unknown' = 'unknown'
    const endpointToValidate = camInvoiceEndpointId || taxId || null
    if (endpointToValidate) {
      try {
        const tokenInfo = await ensureProviderAccessToken({ earlyRefreshSeconds: 60 })
        const detail = await getMemberDetailByEndpoint({
          accessToken: tokenInfo.accessToken,
          endpointId: endpointToValidate,
          baseUrl: tokenInfo.baseUrl || undefined,
        })
        camInvoiceStatusFinal = detail && (detail as any).endpoint_id ? 'registered' : 'not_registered'
      } catch {
        camInvoiceStatusFinal = 'unknown'
      }
    }


    const client = prisma as any
    const created = await client.customer.create({
      data: ({
        tenantId: targetTenantId,
        name,
        businessName,
        // taxId should store endpointId when provided
        taxId: taxId || camInvoiceEndpointId || null,
        // registrationNumber should store VATTIN/TIN per your rule
        registrationNumber: (registrationNumber || tin || null),
        email: email || null,
        phone: phone || null,
        website: website || null,
        address,
        city,
        postalCode: postalCode || null,
        country: country || 'Cambodia',
        camInvoiceEndpointId: camInvoiceEndpointId || null,
        companyNameKh: companyNameKh || null,
        camInvoiceStatus: camInvoiceStatusFinal,

        status: (status?.toUpperCase() as 'ACTIVE' | 'INACTIVE') || 'ACTIVE',
      } as any),
      select: {
        id: true,
        tenantId: true,
        name: true,
        businessName: true,
        taxId: true,
        registrationNumber: true,
        email: true,
        phone: true,
        camInvoiceStatus: true,

        address: true,
        city: true,
        postalCode: true,
        country: true,
        status: true,
        createdAt: true,
      },
    })

    await logAudit({
      userId: user.id,
      tenantId: targetTenantId,
      action: 'CREATE',
      entityType: 'Customer',
      entityId: created.id,
      description: `Created customer ${created.name}`,
      request,
    })

    return NextResponse.json({ success: true, customer: created })
  } catch (error) {
    console.error('Customers POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

