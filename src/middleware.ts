import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define protected routes and their required roles (legacy - now using route arrays below)

// Routes that providers can access (they have full dashboard access)
const providerAccessibleRoutes = [
  '/invoices',
  '/customers',
  '/credit-notes',
  '/users',
  '/audit-logs',
  '/settings',
  '/connection',
  '/provider',
  '/profile'
]

// Routes that tenant users can access
const tenantAccessibleRoutes = [
  '/',
  '/invoices',
  '/customers',
  '/credit-notes',
  '/users',
  '/audit-logs',
  '/settings',
  '/connection',
  '/profile'
]

const publicRoutes = ['/login', '/register', '/onboarding', '/api/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get('better-auth.session_token')
  
  if (!sessionCookie) {
    // Redirect to login if no session
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    // Verify session with our custom auth endpoint
    const sessionResponse = await fetch(`${request.nextUrl.origin}/api/auth/session`, {
      headers: {
        Cookie: request.headers.get('cookie') || '',
      },
    })

    if (!sessionResponse.ok) {
      throw new Error('Invalid session')
    }

    const sessionData = await sessionResponse.json()
    const user = sessionData.user

    if (!user || user.status !== 'ACTIVE') {
      throw new Error('User not active')
    }

    // Check route-specific permissions
    let hasAccess = false

    // Check if user has access to the requested route
    if (user.role === 'PROVIDER') {
      // Providers can access all provider routes and general dashboard routes
      hasAccess = providerAccessibleRoutes.some(route => pathname.startsWith(route)) || pathname === '/'
    } else if (user.role === 'TENANT_ADMIN' || user.role === 'TENANT_USER') {
      // Tenant users can access tenant routes and general dashboard routes
      hasAccess = tenantAccessibleRoutes.some(route => pathname.startsWith(route)) || pathname === '/'
    }

    // If no access, redirect to appropriate dashboard
    if (!hasAccess) {
      if (user.role === 'PROVIDER') {
        return NextResponse.redirect(new URL('/provider', request.url))
      } else {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    // Handle legacy /admin route
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/provider', request.url))
    }

    // Add user info to headers for server components
    const response = NextResponse.next()
    response.headers.set('x-user-id', user.id)
    response.headers.set('x-user-role', user.role)
    response.headers.set('x-user-tenant-id', user.tenantId || '')
    
    return response

  } catch (error) {
    // Redirect to login on any auth error
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (all API endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
