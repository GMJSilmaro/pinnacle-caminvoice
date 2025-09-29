import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { hashPassword } from '../../../../lib/auth'
import jwt from 'jsonwebtoken'

// Verify provider role middleware
async function verifyProviderRole(request: NextRequest) {
  const sessionToken = request.cookies.get('better-auth.session_token')?.value
  
  if (!sessionToken) {
    return null
  }

  try {
    const decoded = jwt.verify(sessionToken, process.env.BETTER_AUTH_SECRET!) as any
    
    // Find session in database
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: {
        user: true,
      },
    })

    if (!session || session.user.role !== 'PROVIDER' || session.user.status !== 'ACTIVE') {
      return null
    }

    return session.user
  } catch (error) {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify provider role
    const providerUser = await verifyProviderRole(request)
    if (!providerUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Provider access required.' },
        { status: 401 }
      )
    }

    const data = await request.json()
    const {
      // Company Information
      companyName,
      taxId,
      registrationNumber,
      website,
      address,
      city,
      postalCode,
      country,
      phone,
      email,
      
      // Admin Account
      createAdminAccount,
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPassword,
    } = data

    // Validate required fields
    if (!companyName || !taxId || !address || !city || !phone || !email) {
      return NextResponse.json(
        { error: 'Missing required company information' },
        { status: 400 }
      )
    }

    // Check if tenant with same tax ID already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { taxId },
    })

    if (existingTenant) {
      return NextResponse.json(
        { error: 'A tenant with this Tax ID already exists' },
        { status: 409 }
      )
    }

    // If creating admin account, validate admin fields
    if (createAdminAccount) {
      if (!adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
        return NextResponse.json(
          { error: 'Missing required admin account information' },
          { status: 400 }
        )
      }

      // Check if admin email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: adminEmail },
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'A user with this admin email already exists' },
          { status: 409 }
        )
      }
    }

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: companyName,
        businessName: companyName,
        taxId,
        registrationNumber: registrationNumber || null,
        email,
        phone,
        website: website || null,
        address,
        city,
        postalCode: postalCode || null,
        country: country || 'Cambodia',
        status: 'ACTIVE',
      },
    })

    let adminUser = null

    // Create admin user if requested
    if (createAdminAccount) {
      const hashedPassword = await hashPassword(adminPassword)
      
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          firstName: adminFirstName,
          lastName: adminLastName,
          password: hashedPassword,
          role: 'TENANT_ADMIN',
          status: 'ACTIVE',
          tenantId: tenant.id,
        },
      })

      // Create audit log for user creation
      await prisma.auditLog.create({
        data: {
          userId: providerUser.id,
          tenantId: tenant.id,
          action: 'CREATE',
          entityType: 'User',
          entityId: adminUser.id,
          description: `Created tenant admin user: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.email})`,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      })
    }

    // Create audit log for tenant creation
    await prisma.auditLog.create({
      data: {
        userId: providerUser.id,
        action: 'CREATE_TENANT',
        entityType: 'Tenant',
        entityId: tenant.id,
        description: `Created new tenant: ${tenant.name} (${tenant.taxId})${createAdminAccount ? ' with admin account' : ''}`,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    })

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        businessName: tenant.businessName,
        taxId: tenant.taxId,
        email: tenant.email,
        status: tenant.status,
      },
      adminUser: adminUser ? {
        id: adminUser.id,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        role: adminUser.role,
      } : null,
    })

  } catch (error) {
    console.error('Tenant creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify provider role
    const providerUser = await verifyProviderRole(request)
    if (!providerUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Provider access required.' },
        { status: 401 }
      )
    }

    // Get all tenants with user counts
    const tenants = await prisma.tenant.findMany({
      include: {
        users: {
          select: {
            id: true,
            role: true,
            status: true,
          },
        },
        _count: {
          select: {
            invoices: true,
            customers: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const tenantsWithStats = tenants.map(tenant => ({
      id: tenant.id,
      name: tenant.name,
      businessName: tenant.businessName,
      taxId: tenant.taxId,
      email: tenant.email,
      phone: tenant.phone,
      address: tenant.address,
      status: tenant.status,
      createdAt: tenant.createdAt,
      stats: {
        totalInvoices: tenant._count.invoices,
        totalCustomers: tenant._count.customers,
        submittedInvoices: 0, // TODO: Calculate from invoice statuses
        acceptedInvoices: 0,  // TODO: Calculate from invoice statuses
        rejectedInvoices: 0,  // TODO: Calculate from invoice statuses
        monthlyRevenue: 0,    // TODO: Calculate from invoices
      },
      users: tenant.users.length,
      activeUsers: tenant.users.filter(u => u.status === 'ACTIVE').length,
      isConnectedToCamInv: tenant.isConnectedToCamInv,
    }))

    return NextResponse.json({
      success: true,
      tenants: tenantsWithStats,
    })

  } catch (error) {
    console.error('Tenant fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
