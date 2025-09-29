import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
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

    // Get current date for monthly calculations
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Get provider configuration
    const providerConfig = await prisma.provider.findFirst({
      where: { isActive: true },
    })

    // Get total tenants count
    const totalTenants = await prisma.tenant.count()

    // Get active tenants count
    const activeTenants = await prisma.tenant.count({
      where: { status: 'ACTIVE' },
    })

    // Get suspended tenants count
    const suspendedTenants = await prisma.tenant.count({
      where: { status: 'SUSPENDED' },
    })

    // Get total invoices count
    const totalInvoices = await prisma.invoice.count()

    // Get monthly invoices count
    const monthlyInvoices = await prisma.invoice.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    })

    // Get last month invoices for comparison
    const lastMonthInvoices = await prisma.invoice.count({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    })

    // Calculate monthly invoice growth
    const monthlyInvoiceGrowth = lastMonthInvoices > 0 
      ? ((monthlyInvoices - lastMonthInvoices) / lastMonthInvoices) * 100 
      : monthlyInvoices > 0 ? 100 : 0

    // Get submitted invoices count
    const submittedInvoices = await prisma.invoice.count({
      where: {
        status: {
          in: ['SUBMITTED', 'ACCEPTED', 'REJECTED'],
        },
      },
    })

    // Get accepted invoices count
    const acceptedInvoices = await prisma.invoice.count({
      where: { status: 'ACCEPTED' },
    })

    // Get rejected invoices count
    const rejectedInvoices = await prisma.invoice.count({
      where: { status: 'REJECTED' },
    })

    // Get monthly revenue (sum of accepted invoices this month)
    const monthlyRevenueResult = await prisma.invoice.aggregate({
      where: {
        status: 'ACCEPTED',
        createdAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        totalAmount: true,
      },
    })

    const monthlyRevenue = monthlyRevenueResult._sum.totalAmount || 0

    // Get last month revenue for comparison
    const lastMonthRevenueResult = await prisma.invoice.aggregate({
      where: {
        status: 'ACCEPTED',
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
      _sum: {
        totalAmount: true,
      },
    })

    const lastMonthRevenue = lastMonthRevenueResult._sum.totalAmount || 0

    // Calculate monthly revenue growth
    const monthlyRevenueGrowth = lastMonthRevenue > 0 
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : monthlyRevenue > 0 ? 100 : 0

    // Get tenants with CamInvoice connection
    const connectedTenants = await prisma.tenant.count({
      where: { isConnectedToCamInv: true },
    })

    // Get total users count
    const totalUsers = await prisma.user.count({
      where: { role: { in: ['TENANT_ADMIN', 'TENANT_USER'] } },
    })

    // Get active users count
    const activeUsers = await prisma.user.count({
      where: { 
        role: { in: ['TENANT_ADMIN', 'TENANT_USER'] },
        status: 'ACTIVE',
      },
    })

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentActivity = await prisma.auditLog.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    })

    return NextResponse.json({
      success: true,
      stats: {
        // Main dashboard stats
        totalTenants,
        activeTenants,
        suspendedTenants,
        totalInvoices,
        monthlyInvoices,
        monthlyInvoiceGrowth: Math.round(monthlyInvoiceGrowth * 100) / 100,
        monthlyRevenue,
        monthlyRevenueGrowth: Math.round(monthlyRevenueGrowth * 100) / 100,
        
        // Invoice statistics
        submittedInvoices,
        acceptedInvoices,
        rejectedInvoices,
        
        // Connection statistics
        connectedTenants,
        connectionRate: totalTenants > 0 ? Math.round((connectedTenants / totalTenants) * 100) : 0,
        
        // User statistics
        totalUsers,
        activeUsers,
        
        // Activity statistics
        recentActivity,
        
        // Provider status
        providerStatus: providerConfig?.isActive ? 'ACTIVE' : 'INACTIVE',
        providerConnected: providerConfig?.isConfigured || false,
        
        // Additional metrics
        averageInvoicesPerTenant: totalTenants > 0 ? Math.round(totalInvoices / totalTenants) : 0,
        tenantGrowthRate: 0, // TODO: Calculate based on historical data
      },
    })

  } catch (error) {
    console.error('Provider stats fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
