import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { verifyAuthentication, verifyTenantAdminRole, getUserFilter, AuthErrors, createErrorResponse } from '../../../lib/tenant-middleware'
import { hashPassword } from '../../../lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthentication(request)
    if (!user) {
      const error = createErrorResponse(AuthErrors.UNAUTHORIZED)
      return NextResponse.json({ error: error.error }, { status: error.status })
    }

    // Apply tenant filtering
    const userFilter = getUserFilter(user)
    
    // Get users with tenant filtering
    const users = await prisma.user.findMany({
      where: {
        ...userFilter,
        // Exclude the current user from the list if they're not a provider
        ...(user.role !== 'PROVIDER' ? { NOT: { id: user.id } } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Transform users to match the expected format
    const transformedUsers = users.map(user => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role.toLowerCase(),
      status: user.status.toLowerCase(),
      tenantId: user.tenantId,
      tenantName: user.tenant?.name || 'No Tenant',
      lastLogin: user.lastLoginAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }))

    // Calculate stats
    const stats = {
      totalUsers: transformedUsers.length,
      activeUsers: transformedUsers.filter(u => u.status === 'active').length,
      adminUsers: transformedUsers.filter(u => u.role === 'tenant_admin').length,
      regularUsers: transformedUsers.filter(u => u.role === 'tenant_user').length,
    }

    return NextResponse.json({
      success: true,
      users: transformedUsers,
      stats,
    })

  } catch (error) {
    console.error('Failed to get users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify tenant admin role
    const user = await verifyTenantAdminRole(request)
    if (!user) {
      const error = createErrorResponse(AuthErrors.TENANT_ADMIN_REQUIRED)
      return NextResponse.json({ error: error.error }, { status: error.status })
    }

    const {
      firstName,
      lastName,
      email,
      role,
      password,
      tenantId, // Only providers can specify tenantId
    } = await request.json()

    // Validate required fields
    if (!firstName || !lastName || !email || !role || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
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

    // Validate role
    const validRoles = ['TENANT_ADMIN', 'TENANT_USER']
    if (!validRoles.includes(role.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid role. Must be TENANT_ADMIN or TENANT_USER' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Determine target tenant
    let targetTenantId: string
    if (user.role === 'PROVIDER' && tenantId) {
      // Providers can create users for any tenant
      targetTenantId = tenantId
    } else if (user.tenantId) {
      // Tenant admins can only create users for their own tenant
      targetTenantId = user.tenantId
    } else {
      return NextResponse.json(
        { error: 'No tenant specified' },
        { status: 400 }
      )
    }

    // Verify target tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: targetTenantId },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: role.toUpperCase() as 'TENANT_ADMIN' | 'TENANT_USER',
        status: 'ACTIVE',
        tenantId: targetTenantId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        tenantId: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        name: `${newUser.firstName} ${newUser.lastName}`,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role.toLowerCase(),
        status: newUser.status.toLowerCase(),
        tenantId: newUser.tenantId,
        tenantName: newUser.tenant?.name || 'No Tenant',
        createdAt: newUser.createdAt.toISOString(),
      },
    })

  } catch (error) {
    console.error('Failed to create user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
