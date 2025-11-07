import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

// Paths to exclude from token injection (avoid recursion)
const EXCLUDE = [
  '/api/internal/caminvoice/access-token',
  '/_next',
  '/favicon.ico',
  '/assets',
]

// Public routes that do not require session
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/onboarding',
  '/api/auth',
  '/auth/callback',
]

// Provider vs Tenant accessible routes (kept minimal; detailed checks are server-side)
const PROVIDER_ROUTES = ['/provider', '/portal'] // Providers can access both provider and portal routes
const TENANT_ROUTES = ['/portal']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  console.log('[Middleware] Processing request for path:', pathname)

  // Skip excluded paths outright
  if (EXCLUDE.some((p) => pathname.startsWith(p))) {
    console.log('[Middleware] Path excluded:', pathname)
    return NextResponse.next()
  }

  // Branch 1: API requests → inject CamInvoice provider token
  if (pathname.startsWith('/api/')) {
    const reqHeaders = new Headers(request.headers)
    try {
      const url = new URL('/api/internal/caminvoice/access-token', request.url)
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'x-internal-request': 'middleware' },
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.accessToken) reqHeaders.set('x-caminvoice-provider-token', data.accessToken as string)
        if (data?.baseUrl) reqHeaders.set('x-caminvoice-base-url', data.baseUrl as string)
        if (data?.expiresAt) reqHeaders.set('x-caminvoice-token-expires-at', String(data.expiresAt))
      }
    } catch {
      // Fail open: downstream may still handle token fallback
    }
    return NextResponse.next({ request: { headers: reqHeaders } })
  }

  // Branch 2: Non-API requests → session gate and role-aware redirects
  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    console.log('[Middleware] Public route allowed:', pathname)
    return NextResponse.next()
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get('better-auth.session_token')
  if (!sessionCookie || !sessionCookie.value) {
    console.log('[Middleware] No session cookie found for path:', pathname)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verify JWT token directly in middleware for faster validation
  try {
    // Check if BETTER_AUTH_SECRET is set
    if (!process.env.BETTER_AUTH_SECRET) {
      console.error('[Middleware] BETTER_AUTH_SECRET is not set!')
      throw new Error('Auth secret not configured')
    }

    // Verify the JWT token
    const decoded = jwt.verify(sessionCookie.value, process.env.BETTER_AUTH_SECRET) as any
    
    if (!decoded) {
      console.log('[Middleware] Invalid JWT token, redirecting to login')
      throw new Error('Invalid token')
    }
    
    console.log('[Middleware] JWT verified for user:', decoded.userId || decoded.sub)

    // For protected routes, we'll verify the session with the database
    // But only if we have a valid JWT first
    const sessionResponse = await fetch(`${request.nextUrl.origin}/api/auth/session`, {
      headers: { Cookie: request.headers.get('cookie') || '' },
      cache: 'no-store',
    })
    
    if (!sessionResponse.ok) {
      console.log('[Middleware] Session validation failed, redirecting to login')
      throw new Error('Invalid session')
    }
    
    const sessionData = await sessionResponse.json()
    const user = sessionData.user
    
    if (!user || user.status !== 'ACTIVE') {
      console.log('[Middleware] User not found or inactive, redirecting to login')
      throw new Error('User not active')
    }

    // Handle root path redirect based on user role
    if (pathname === '/') {
      if (user.role === 'PROVIDER') {
        return NextResponse.redirect(new URL('/provider', request.url))
      } else {
        return NextResponse.redirect(new URL('/portal', request.url))
      }
    }

    // Basic role-based access redirect (keep detailed checks server-side)
    let hasAccess = true
    if (user.role === 'PROVIDER') {
      hasAccess = PROVIDER_ROUTES.some((r) => pathname.startsWith(r))
    } else {
      // Tenant roles
      if (pathname.startsWith('/provider')) hasAccess = false // Tenant users cannot access provider routes
    }

    if (!hasAccess) {
      if (user.role === 'PROVIDER') {
        return NextResponse.redirect(new URL('/provider', request.url))
      }
      return NextResponse.redirect(new URL('/portal', request.url))
    }

    // Legacy redirect: /admin → /provider
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/provider', request.url))
    }

    // Attach user context to response headers for server components
    const response = NextResponse.next()
    response.headers.set('x-user-id', user.id)
    response.headers.set('x-user-role', user.role)
    response.headers.set('x-user-tenant-id', user.tenantId || '')
    console.log('[Middleware] Access granted for user:', user.id, 'to path:', pathname)
    return response
  } catch (error) {
    console.error('[Middleware] Authentication error for path:', pathname, 'Error:', error)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  // Run for both API and app routes; exclude static assets/images and favicon
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|assets|public).*)',
  ],
}

