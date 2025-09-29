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

    const where = {
      ...getTenantFilter(user),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { taxId: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
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
          email: true,
          phone: true,
          address: true,
          city: true,
          country: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      customers,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
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
    } = body || {}

    if (!name || !address || !city) {
      return NextResponse.json({ error: 'Name, address and city are required' }, { status: 400 })
    }

    const targetTenantId =
      user.role === 'PROVIDER' && tenantId ? tenantId : user.tenantId

    if (!targetTenantId) {
      return NextResponse.json({ error: 'No tenant specified' }, { status: 400 })
    }

    const created = await prisma.customer.create({
      data: {
        tenantId: targetTenantId,
        name,
        businessName: businessName || null,
        taxId: taxId || null,
        registrationNumber: registrationNumber || null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        address,
        city,
        postalCode: postalCode || null,
        country: country || 'Cambodia',
        status: (status?.toUpperCase() as 'ACTIVE' | 'INACTIVE') || 'ACTIVE',
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

