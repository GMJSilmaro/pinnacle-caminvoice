import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { verifyAuthentication, verifyTenantAdminRole, AuthErrors, createErrorResponse } from '../../../../lib/tenant-middleware'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthentication(request)
    if (!user) {
      const error = createErrorResponse(AuthErrors.UNAUTHORIZED)
      return NextResponse.json({ error: error.error }, { status: error.status })
    }

    // Tenant users must have a tenant, providers don't need one for this endpoint
    if (user.role !== 'PROVIDER' && !user.tenantId) {
      return NextResponse.json(
        { error: 'No company profile found. Please contact your administrator.' },
        { status: 404 }
      )
    }

    // Get tenant data - for providers, this would be a specific tenant ID from query params
    // For now, we'll handle tenant users accessing their own company profile
    let tenant
    if (user.role === 'PROVIDER') {
      // For providers, we might need a tenantId query parameter
      const tenantId = request.nextUrl.searchParams.get('tenantId')
      if (tenantId) {
        tenant = await prisma.tenant.findUnique({
          where: { id: tenantId }
        })
      } else {
        return NextResponse.json(
          { error: 'Tenant ID required for provider access.' },
          { status: 400 }
        )
      }
    } else {
      // For tenant users, get their own tenant
      tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId! }
      })
    }

    if (!tenant) {
      return NextResponse.json(
        { error: 'Company profile not found.' },
        { status: 404 }
      )
    }

    const companyProfile = {
      companyName: tenant.name || '',
      taxId: tenant.taxId || '',
      registrationNumber: tenant.registrationNumber || '',
      address: tenant.address || '',
      city: tenant.city || '',
      postalCode: tenant.postalCode || '',
      country: tenant.country || 'Cambodia',
      phone: tenant.phone || '',
      email: tenant.email || '',
      website: tenant.website || '',
      currency: tenant.currency || 'USD',
      taxRate: tenant.taxRate || 10,
      invoicePrefix: tenant.invoicePrefix || 'INV',
      invoiceNumberStart: tenant.invoiceNumberStart || 1000,
    }

    return NextResponse.json({
      success: true,
      company: companyProfile,
    })

  } catch (error) {
    console.error('Failed to get company profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and tenant admin role
    const user = await verifyTenantAdminRole(request)
    if (!user) {
      const error = createErrorResponse(AuthErrors.TENANT_ADMIN_REQUIRED)
      return NextResponse.json({ error: error.error }, { status: error.status })
    }

    const {
      companyName,
      taxId,
      registrationNumber,
      address,
      city,
      postalCode,
      country,
      phone,
      email,
      website,
      currency,
      taxRate,
      invoicePrefix,
      invoiceNumberStart,
      tenantId: tenantIdFromBody,
    } = await request.json()

    // Validate required fields
    if (!companyName || !taxId || !address || !city || !email) {
      return NextResponse.json(
        { error: 'Company name, tax ID, address, city, and email are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^\S+@\S+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Determine which tenant to update
    let targetTenantId: string
    if (user.role === 'PROVIDER') {
      // For providers, allow tenantId via query string OR request body OR header
      const tenantIdFromQuery = request.nextUrl.searchParams.get('tenantId')
      // Body was already parsed above; reuse parsed value if present
      const tenantIdFromHeader = request.headers.get('x-tenant-id') || undefined
      const resolvedTenantId = tenantIdFromQuery || tenantIdFromBody || tenantIdFromHeader
      if (!resolvedTenantId) {
        return NextResponse.json(
          { error: 'Tenant ID required for provider access.' },
          { status: 400 }
        )
      }
      targetTenantId = resolvedTenantId
    } else {
      // For tenant users, use their own tenant
      if (!user.tenantId) {
        return NextResponse.json(
          { error: 'No tenant associated with user.' },
          { status: 400 }
        )
      }
      targetTenantId = user.tenantId
    }

    // Update tenant profile
    const updatedTenant = await prisma.tenant.update({
      where: { id: targetTenantId },
      data: {
        name: companyName,
        businessName: companyName, // Keep businessName in sync
        taxId,
        registrationNumber,
        address,
        city,
        postalCode,
        country,
        phone,
        email,
        website,
        currency,
        taxRate: parseFloat(taxRate) || 10,
        invoicePrefix,
        invoiceNumberStart: parseInt(invoiceNumberStart) || 1000,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Company profile updated successfully',
      company: {
        companyName: updatedTenant.name,
        taxId: updatedTenant.taxId,
        registrationNumber: updatedTenant.registrationNumber,
        address: updatedTenant.address,
        city: updatedTenant.city,
        postalCode: updatedTenant.postalCode,
        country: updatedTenant.country,
        phone: updatedTenant.phone,
        email: updatedTenant.email,
        website: updatedTenant.website,
        currency: updatedTenant.currency,
        taxRate: updatedTenant.taxRate,
        invoicePrefix: updatedTenant.invoicePrefix,
        invoiceNumberStart: updatedTenant.invoiceNumberStart,
      },
    })

  } catch (error) {
    console.error('Failed to update company profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
