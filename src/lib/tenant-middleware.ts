import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import jwt from 'jsonwebtoken'

export interface AuthenticatedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'PROVIDER' | 'TENANT_ADMIN' | 'TENANT_USER'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  tenantId: string | null
  tenant?: {
    id: string
    name: string
    status: string
  } | null
}

/**
 * Verify user authentication and return user data
 */
export async function verifyAuthentication(request: NextRequest): Promise<AuthenticatedUser | null> {
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
        user: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    })

    if (!session || session.user.status !== 'ACTIVE') {
      return null
    }

    return {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      role: session.user.role as 'PROVIDER' | 'TENANT_ADMIN' | 'TENANT_USER',
      status: session.user.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
      tenantId: session.user.tenantId,
      tenant: session.user.tenant,
    }
  } catch (error) {
    return null
  }
}

/**
 * Verify that user has provider role
 */
export async function verifyProviderRole(request: NextRequest): Promise<AuthenticatedUser | null> {
  const user = await verifyAuthentication(request)
  
  if (!user || user.role !== 'PROVIDER') {
    return null
  }
  
  return user
}

/**
 * Verify that user has tenant admin role or higher
 */
export async function verifyTenantAdminRole(request: NextRequest): Promise<AuthenticatedUser | null> {
  const user = await verifyAuthentication(request)
  
  if (!user || (user.role !== 'TENANT_ADMIN' && user.role !== 'PROVIDER')) {
    return null
  }
  
  return user
}

/**
 * Get tenant-scoped query filter
 * Returns empty object for providers (access to all data)
 * Returns { tenantId: user.tenantId } for tenant users
 */
export function getTenantFilter(user: AuthenticatedUser): { tenantId?: string } {
  // Providers can access all tenant data
  if (user.role === 'PROVIDER') {
    return {}
  }
  
  // Tenant users can only access their own tenant's data
  if (user.tenantId) {
    return { tenantId: user.tenantId }
  }
  
  // This should not happen, but return empty filter as fallback
  return {}
}

/**
 * Verify that user can access specific tenant data
 */
export function canAccessTenant(user: AuthenticatedUser, targetTenantId: string): boolean {
  // Providers can access all tenants
  if (user.role === 'PROVIDER') {
    return true
  }
  
  // Tenant users can only access their own tenant
  return user.tenantId === targetTenantId
}

/**
 * Get user-scoped query filter for user management
 * Returns empty object for providers (access to all users)
 * Returns { tenantId: user.tenantId } for tenant users (only their tenant's users)
 */
export function getUserFilter(user: AuthenticatedUser): { tenantId?: string } {
  return getTenantFilter(user)
}

/**
 * Middleware response helpers
 */
export const AuthErrors = {
  UNAUTHORIZED: { error: 'Unauthorized. Please log in.', status: 401 },
  FORBIDDEN: { error: 'Forbidden. Insufficient permissions.', status: 403 },
  PROVIDER_REQUIRED: { error: 'Provider role required.', status: 403 },
  TENANT_ADMIN_REQUIRED: { error: 'Tenant administrator role required.', status: 403 },
  TENANT_ACCESS_DENIED: { error: 'Access denied. Cannot access this tenant data.', status: 403 },
} as const

/**
 * Helper to create consistent error responses
 */
export function createErrorResponse(error: typeof AuthErrors[keyof typeof AuthErrors]) {
  return { error: error.error, status: error.status }
}

/**
 * Validate tenant access for a specific tenant ID
 */
export async function validateTenantAccess(
  request: NextRequest, 
  targetTenantId: string
): Promise<{ user: AuthenticatedUser } | { error: string; status: number }> {
  const user = await verifyAuthentication(request)
  
  if (!user) {
    return createErrorResponse(AuthErrors.UNAUTHORIZED)
  }
  
  if (!canAccessTenant(user, targetTenantId)) {
    return createErrorResponse(AuthErrors.TENANT_ACCESS_DENIED)
  }
  
  return { user }
}

/**
 * Apply tenant filtering to Prisma queries
 */
export function applyTenantFilter<T extends Record<string, any>>(
  user: AuthenticatedUser,
  baseQuery: T
): T & { tenantId?: string } {
  const tenantFilter = getTenantFilter(user)
  return { ...baseQuery, ...tenantFilter }
}
