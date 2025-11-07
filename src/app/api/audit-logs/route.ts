import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma'
import { verifyAuthentication, createErrorResponse, AuthErrors } from '@/lib/tenant-middleware'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthentication(request)
    
    if (!user) {
      const err = createErrorResponse(AuthErrors.UNAUTHORIZED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const action = searchParams.get('action')
    const entityType = searchParams.get('entityType')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause based on user role
    const whereClause: Prisma.AuditLogWhereInput = {}

    // If user is tenant admin/user, filter by tenant
    if (user.role === 'TENANT_ADMIN' || user.role === 'TENANT_USER') {
      if (!user.tenantId) {
        return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
      }
      whereClause.tenantId = user.tenantId
    }
    // Provider users can see all logs

    // Apply filters
    if (action) {
      whereClause.action = action as any
    }
    if (entityType) {
      whereClause.entityType = entityType
    }
    if (userId) {
      whereClause.userId = userId
    }
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate)
      }
    }

    // Fetch audit logs with user information
    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where: whereClause }),
    ])

    // Calculate statistics
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const stats = await prisma.auditLog.groupBy({
      by: ['action'],
      where: whereClause,
      _count: true,
    })

    const todayStats = await prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        ...whereClause,
        createdAt: {
          gte: today,
        },
      },
      _count: true,
    })

    // Calculate total events
    const totalEvents = stats.reduce((sum, stat) => sum + stat._count, 0)
    const todayEvents = todayStats.reduce((sum, stat) => sum + stat._count, 0)

    // Calculate user actions (actions initiated by users)
    const userActions = [
      'CREATE',
      'UPDATE',
      'DELETE',
      'LOGIN',
      'LOGOUT',
      'SUBMIT_INVOICE',
      'APPROVE_INVOICE',
      'REJECT_INVOICE',
    ]
    const userActionsCount = stats
      .filter((s) => userActions.includes(s.action))
      .reduce((sum, stat) => sum + stat._count, 0)
    const todayUserActionsCount = todayStats
      .filter((s) => userActions.includes(s.action))
      .reduce((sum, stat) => sum + stat._count, 0)

    // Calculate system events
    const systemActions = ['SYNC_INVOICES', 'WEBHOOK_RECEIVED']
    const systemEventsCount = stats
      .filter((s) => systemActions.includes(s.action))
      .reduce((sum, stat) => sum + stat._count, 0)
    const todaySystemEventsCount = todayStats
      .filter((s) => systemActions.includes(s.action))
      .reduce((sum, stat) => sum + stat._count, 0)

    // Calculate security events
    const securityActions = [
      'LOGIN',
      'LOGOUT',
      'CONFIGURE_PROVIDER',
      'CREATE_TENANT',
      'SUSPEND_TENANT',
      'ACTIVATE_TENANT',
    ]
    const securityEventsCount = stats
      .filter((s) => securityActions.includes(s.action))
      .reduce((sum, stat) => sum + stat._count, 0)
    const todaySecurityEventsCount = todayStats
      .filter((s) => securityActions.includes(s.action))
      .reduce((sum, stat) => sum + stat._count, 0)

    // Get failed actions count (this would require additional metadata tracking)
    // For now, we'll return 0 or calculate based on metadata if available
    const failedActionsCount = 0
    const todayFailedActionsCount = 0

    // Get API/webhook calls
    const apiActions = ['WEBHOOK_RECEIVED', 'SYNC_INVOICES']
    const apiCallsCount = stats
      .filter((s) => apiActions.includes(s.action))
      .reduce((sum, stat) => sum + stat._count, 0)
    const todayApiCallsCount = todayStats
      .filter((s) => apiActions.includes(s.action))
      .reduce((sum, stat) => sum + stat._count, 0)

    // Get recent activity (last 5 logs)
    const recentActivity = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    })

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        timestamp: log.createdAt.toISOString(),
        user: log.user
          ? `${log.user.firstName} ${log.user.lastName}`
          : 'System',
        userId: log.userId,
        action: formatAction(log.action),
        actionType: log.action,
        resource: log.entityType,
        entityId: log.entityId,
        ip: log.ipAddress || 'N/A',
        status: 'Success', // Can be enhanced based on metadata
        details: log.description,
        type: mapActionToType(log.action),
        avatar: log.user
          ? `${log.user.firstName[0]}${log.user.lastName[0]}`
          : 'SY',
        userAgent: log.userAgent,
        severity: getSeverity(log.action),
        metadata: log.metadata,
      })),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + logs.length < totalCount,
      },
      statistics: {
        totalEvents: {
          value: totalEvents,
          todayChange: todayEvents,
        },
        userActions: {
          value: userActionsCount,
          todayChange: todayUserActionsCount,
        },
        systemEvents: {
          value: systemEventsCount,
          todayChange: todaySystemEventsCount,
        },
        securityEvents: {
          value: securityEventsCount,
          todayChange: todaySecurityEventsCount,
        },
        failedActions: {
          value: failedActionsCount,
          todayChange: todayFailedActionsCount,
        },
        apiCalls: {
          value: apiCallsCount,
          todayChange: todayApiCallsCount,
        },
      },
      recentActivity: recentActivity.map((log) => ({
        time: formatTimeAgo(log.createdAt),
        action: log.description,
        user: log.user
          ? `${log.user.firstName} ${log.user.lastName}`
          : 'System',
        actionType: log.action,
      })),
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}

// Helper function to format action names
function formatAction(action: string): string {
  const actionMap: Record<string, string> = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
    LOGIN: 'User Login',
    LOGOUT: 'User Logout',
    SUBMIT_INVOICE: 'Invoice Submitted',
    APPROVE_INVOICE: 'Invoice Approved',
    REJECT_INVOICE: 'Invoice Rejected',
    CONFIGURE_PROVIDER: 'Provider Configured',
    CREATE_TENANT: 'Tenant Created',
    SUSPEND_TENANT: 'Tenant Suspended',
    ACTIVATE_TENANT: 'Tenant Activated',
    WEBHOOK_RECEIVED: 'Webhook Received',
    SYNC_INVOICES: 'Invoices Synced',
  }
  return actionMap[action] || action
}

// Helper function to map action to type for UI display
function mapActionToType(action: string): string {
  const typeMap: Record<string, string> = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    LOGIN: 'AUTH',
    LOGOUT: 'AUTH',
    SUBMIT_INVOICE: 'INTEGRATION',
    APPROVE_INVOICE: 'UPDATE',
    REJECT_INVOICE: 'UPDATE',
    CONFIGURE_PROVIDER: 'CONFIG',
    CREATE_TENANT: 'CREATE',
    SUSPEND_TENANT: 'PERMISSION',
    ACTIVATE_TENANT: 'PERMISSION',
    WEBHOOK_RECEIVED: 'WEBHOOK',
    SYNC_INVOICES: 'SYSTEM',
  }
  return typeMap[action] || 'SYSTEM'
}

// Helper function to determine severity
function getSeverity(action: string): 'low' | 'medium' | 'high' | 'critical' {
  const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    CREATE: 'low',
    UPDATE: 'low',
    DELETE: 'medium',
    LOGIN: 'low',
    LOGOUT: 'low',
    SUBMIT_INVOICE: 'medium',
    APPROVE_INVOICE: 'medium',
    REJECT_INVOICE: 'medium',
    CONFIGURE_PROVIDER: 'high',
    CREATE_TENANT: 'high',
    SUSPEND_TENANT: 'high',
    ACTIVATE_TENANT: 'high',
    WEBHOOK_RECEIVED: 'medium',
    SYNC_INVOICES: 'low',
  }
  return severityMap[action] || 'low'
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

  if (seconds < 60) return `${seconds} seconds ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

