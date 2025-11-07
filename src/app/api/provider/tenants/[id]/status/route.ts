import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify provider role
    const user = await verifyProviderRole(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Provider role required.' },
        { status: 401 }
      )
    }

    const { status } = await request.json()
    const { id: tenantId } = await params

    if (!status || !['active', 'suspended', 'pending', 'inactive'].includes(status.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: active, suspended, pending, inactive' },
        { status: 400 }
      )
    }

    // Find the tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Update tenant status
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: status.toUpperCase(),
        updatedAt: new Date(),
      },
    })

    // If suspending tenant, also suspend all users
    if (status.toLowerCase() === 'suspended') {
      await prisma.user.updateMany({
        where: { tenantId: tenantId },
        data: {
          status: 'SUSPENDED',
          updatedAt: new Date(),
        },
      })
    }

    // If activating tenant, reactivate users (but only those that were active before)
    if (status.toLowerCase() === 'active') {
      await prisma.user.updateMany({
        where: { 
          tenantId: tenantId,
          status: 'SUSPENDED' // Only reactivate suspended users
        },
        data: {
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Tenant status updated to ${status}`,
      tenant: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        status: updatedTenant.status,
        updatedAt: updatedTenant.updatedAt,
      },
    })

  } catch (error) {
    console.error('Failed to update tenant status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
