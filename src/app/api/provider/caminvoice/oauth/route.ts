import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import jwt from 'jsonwebtoken'

// Verify provider role middleware
async function verifyProviderRole(request: NextRequest) {
  const sessionToken = request.cookies.get('better-auth.session_token')?.value
  
  if (!sessionToken) {
    return null
  }

  try {
    jwt.verify(sessionToken, process.env.BETTER_AUTH_SECRET!)
    
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

// GET - Get OAuth authorization URL
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

    // Get provider configuration
    const provider = await prisma.provider.findFirst({
      where: { isActive: true },
    })

    if (!provider || !provider.clientId || !provider.redirectUrls.length) {
      return NextResponse.json(
        { error: 'Provider configuration not found or incomplete' },
        { status: 404 }
      )
    }

    // Generate state parameter for security
    const state = jwt.sign(
      { 
        providerId: provider.id,
        userId: providerUser.id,
        timestamp: Date.now()
      },
      process.env.BETTER_AUTH_SECRET!,
      { expiresIn: '1h' }
    )

    // Build OAuth authorization URL (CamInvoice uses /connect)
    const base = provider.baseUrl.replace(/\/+$/, '')
    const authUrl = new URL(`${base}/connect`)
    authUrl.searchParams.set('client_id', provider.clientId)
    authUrl.searchParams.set('redirect_url', provider.redirectUrls[0])
    authUrl.searchParams.set('state', state)

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      state,
    })

  } catch (error) {
    console.error('OAuth URL generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Handle OAuth callback and exchange code for tokens
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
    const { authToken: bodyAuthToken, code, state } = data
    const authToken = bodyAuthToken || code

    if (!authToken) {
      return NextResponse.json(
        { error: 'authToken is required' },
        { status: 400 }
      )
    }

    // Require and verify state parameter to prevent CSRF
    if (!state) {
      return NextResponse.json(
        { error: 'state is required' },
        { status: 400 }
      )
    }
    try {
      const stateData = jwt.verify(state, process.env.BETTER_AUTH_SECRET!) as any
      if (stateData.userId !== providerUser.id) {
        throw new Error('Invalid state parameter')
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired state parameter' },
        { status: 400 }
      )
    }

    // Get provider configuration
    const provider = await prisma.provider.findFirst({
      where: { isActive: true },
    })

    if (!provider || !provider.clientId || !provider.clientSecret) {
      return NextResponse.json(
        { error: 'Provider configuration not found or incomplete' },
        { status: 404 }
      )
    }

    try {
      // Exchange authToken for access/refresh tokens (per CamInvoice docs).
      const base = provider.baseUrl.replace(/\/+$/, '')
      const basic = Buffer.from(`${provider.clientId}:${provider.clientSecret}`).toString('base64')
      const primaryUrl = `${base}/api/v1/auth/authorize/connect`

      async function callTokenEndpoint(targetUrl: string) {
        return fetch(targetUrl, {
          method: 'POST',
          redirect: 'manual',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Basic ${basic}`,
          },
          body: JSON.stringify({ auth_token: authToken }),
        })
      }

      let tokenResponse = await callTokenEndpoint(primaryUrl)

      // 404-only fallback for sandbox variant without /auth prefix
      if (tokenResponse.status === 404) {
        const fallbackUrl = `${base}/api/v1/authorize/connect`
        console.warn(`[CamInvoice OAuth] Primary token endpoint 404. Trying fallback: ${fallbackUrl}`)
        tokenResponse = await callTokenEndpoint(fallbackUrl)
      }

      // If still 404 and domain is e-invoice.gov.kh, try common sandbox API host permutations
      if (tokenResponse.status === 404) {
        try {
          const u = new URL(base)
          const host = u.hostname
          const suffix = host.replace(/^([^\.]+\.)?e-invoice\.gov\.kh$/i, 'e-invoice.gov.kh')
          const candidateBases: string[] = []
          if (/\.e-invoice\.gov\.kh$/i.test(host)) {
            // sandbox -> sandbox-api, and api.sandbox
            if (/^sandbox\./i.test(host)) {
              candidateBases.push(`${u.protocol}//sandbox-api.${suffix}`)
              candidateBases.push(`${u.protocol}//api.sandbox.${suffix}`)
            }
            // generic -> api.
            candidateBases.push(`${u.protocol}//api.${suffix}`)
          }

          for (const altBase of candidateBases) {
            const altPrimary = `${altBase}/api/v1/auth/authorize/connect`
            const altFallback = `${altBase}/api/v1/authorize/connect`
            console.warn(`[CamInvoice OAuth] Trying alternative base host: ${altBase}`)
            tokenResponse = await callTokenEndpoint(altPrimary)
            if (tokenResponse.status === 404) {
              tokenResponse = await callTokenEndpoint(altFallback)
            }
            if (tokenResponse.ok || (tokenResponse.status >= 300 && tokenResponse.status < 400)) break
          }
        } catch {}
      }

      // Handle potential redirects (e.g., to a portal HTML page)
      if (tokenResponse.status >= 300 && tokenResponse.status < 400) {
        const location = tokenResponse.headers.get('location') || 'unknown'
        throw new Error(`Token endpoint redirected with status ${tokenResponse.status} to ${location}. Check baseUrl domain and path.`)
      }

      if (!tokenResponse.ok) {
        const raw = await tokenResponse.text().catch(() => '')
        throw new Error(`Token exchange failed: ${tokenResponse.status} - ${raw.slice(0, 200)}`)
      }

      const contentType = tokenResponse.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        const raw = await tokenResponse.text().catch(() => '')
        throw new Error(`Unexpected token response content-type: ${contentType} - ${raw.slice(0, 200)}`)
      }

      const tokenData: any = await tokenResponse.json().catch(() => null)
      const { access_token, refresh_token, expires_in, token_type } = tokenData || {}

      if (!access_token) {
        throw new Error('No access token received')
      }

      // Calculate token expiration
      const tokenExpiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null

      // Update provider with OAuth tokens
      await prisma.provider.update({
        where: { id: provider.id },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token || null,
          tokenExpiresAt,
          isConfigured: true,
          updatedAt: new Date(),
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: providerUser.id,
          action: 'CONFIGURE_PROVIDER',
          entityType: 'Provider',
          entityId: provider.id,
          description: 'Successfully completed OAuth authorization with CamInvoice',
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      })

      // Do not echo tokens back to the client
      return NextResponse.json({
        success: true,
        message: 'OAuth authorization completed successfully',
        tokenType: token_type || 'Bearer',
        expiresAt: tokenExpiresAt?.toISOString(),
      })

    } catch (error) {
      console.error('OAuth token exchange error:', error)
      
      // For development/testing, simulate successful OAuth
      if (process.env.NODE_ENV === 'development') {
        const simulatedToken = `sim_token_${Date.now()}`
        const tokenExpiresAt = new Date(Date.now() + 3600 * 1000) // 1 hour

        await prisma.provider.update({
          where: { id: provider.id },
          data: {
            accessToken: simulatedToken,
            refreshToken: `sim_refresh_${Date.now()}`,
            tokenExpiresAt,
            isConfigured: true,
            updatedAt: new Date(),
          },
        })

        // Create audit log
        await prisma.auditLog.create({
          data: {
            userId: providerUser.id,
            action: 'CONFIGURE_PROVIDER',
            entityType: 'Provider',
            entityId: provider.id,
            description: 'Successfully completed OAuth authorization with CamInvoice (simulated)',
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
          },
        })

        return NextResponse.json({
          success: true,
          message: 'OAuth authorization completed successfully (simulated)',
          tokenType: 'Bearer',
          expiresAt: tokenExpiresAt.toISOString(),
        })
      }

      return NextResponse.json(
        {
          error: 'OAuth authorization failed',
          details: process.env.NODE_ENV !== 'production' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
