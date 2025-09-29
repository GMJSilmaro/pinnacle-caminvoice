import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { verifyAuthentication, verifyTenantAdminRole, canAccessTenant, AuthErrors, createErrorResponse } from '../../../../lib/tenant-middleware'
import { hashPassword } from '../../../../lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await verifyAuthentication(request)
    if (!user) {
      const error = createErrorResponse(AuthErrors.UNAUTHORIZED)
      return NextResponse.json({ error: error.error }, { status: error.status })
    }

    const userId = params.id

    // Get the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
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
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check tenant access
    if (targetUser.tenantId && !canAccessTenant(user, targetUser.tenantId)) {
      const error = createErrorResponse(AuthErrors.TENANT_ACCESS_DENIED)
      return NextResponse.json({ error: error.error }, { status: error.status })
    }

    // Transform user data
    const transformedUser = {
      id: targetUser.id,
      name: `${targetUser.firstName} ${targetUser.lastName}`,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      email: targetUser.email,
      role: targetUser.role.toLowerCase(),
      status: targetUser.status.toLowerCase(),
      tenantId: targetUser.tenantId,
      tenantName: targetUser.tenant?.name || 'No Tenant',
      lastLogin: targetUser.lastLoginAt?.toISOString() || null,
      createdAt: targetUser.createdAt.toISOString(),
      updatedAt: targetUser.updatedAt.toISOString(),
    }

    return NextResponse.json({
      success: true,
      user: transformedUser,
    })

  } catch (error) {
    console.error('Failed to get user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify tenant admin role
    const user = await verifyTenantAdminRole(request)
    if (!user) {
      const error = createErrorResponse(AuthErrors.TENANT_ADMIN_REQUIRED)
      return NextResponse.json({ error: error.error }, { status: error.status })
    }

    const userId = params.id
    const {
      firstName,
      lastName,
      email,
      role,
      status,
    } = await request.json()

    // Get the target user first to check tenant access
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        email: true,
      },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check tenant access
    if (targetUser.tenantId && !canAccessTenant(user, targetUser.tenantId)) {
      const error = createErrorResponse(AuthErrors.TENANT_ACCESS_DENIED)
      return NextResponse.json({ error: error.error }, { status: error.status })
    }

    // Validate email if provided and different
    if (email && email !== targetUser.email) {
      const emailRegex = /^\S+@\S+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        )
      }
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['TENANT_ADMIN', 'TENANT_USER']
      if (!validRoles.includes(role.toUpperCase())) {
        return NextResponse.json(
          { error: 'Invalid role. Must be TENANT_ADMIN or TENANT_USER' },
          { status: 400 }
        )
      }
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED']
      if (!validStatuses.includes(status.toUpperCase())) {
        return NextResponse.json(
          { error: 'Invalid status. Must be ACTIVE, INACTIVE, or SUSPENDED' },
          { status: 400 }
        )
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(role && { role: role.toUpperCase() as 'TENANT_ADMIN' | 'TENANT_USER' }),
        ...(status && { status: status.toUpperCase() as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' }),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        tenantId: true,
        updatedAt: true,
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
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        name: `${updatedUser.firstName} ${updatedUser.lastName}`,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role.toLowerCase(),
        status: updatedUser.status.toLowerCase(),
        tenantId: updatedUser.tenantId,
        tenantName: updatedUser.tenant?.name || 'No Tenant',
        updatedAt: updatedUser.updatedAt.toISOString(),
      },
    })

  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify tenant admin role
    const user = await verifyTenantAdminRole(request)
    if (!user) {
      const error = createErrorResponse(AuthErrors.TENANT_ADMIN_REQUIRED)
      return NextResponse.json({ error: error.error }, { status: error.status })
    }

    const userId = params.id

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Get the target user first to check tenant access
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check tenant access
    if (targetUser.tenantId && !canAccessTenant(user, targetUser.tenantId)) {
      const error = createErrorResponse(AuthErrors.TENANT_ACCESS_DENIED)
      return NextResponse.json({ error: error.error }, { status: error.status })
    }

    // Delete user (this will cascade delete sessions due to schema)
    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.firstName} ${targetUser.lastName} deleted successfully`,
    })

  } catch (error) {
    console.error('Failed to delete user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
