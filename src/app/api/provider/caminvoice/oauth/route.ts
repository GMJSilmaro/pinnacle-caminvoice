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
      where: { status: 'ACTIVE' },
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

    // Build OAuth authorization URL
    const authUrl = new URL(`${provider.baseUrl}/oauth/authorize`)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', provider.clientId)
    authUrl.searchParams.set('redirect_uri', provider.redirectUrls[0])
    authUrl.searchParams.set('scope', 'read write') // Adjust scopes as needed
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
    const { code, state } = data

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Authorization code and state are required' },
        { status: 400 }
      )
    }

    // Verify state parameter
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
      where: { status: 'ACTIVE' },
    })

    if (!provider || !provider.clientId || !provider.clientSecret) {
      return NextResponse.json(
        { error: 'Provider configuration not found or incomplete' },
        { status: 404 }
      )
    }

    try {
      // Exchange authorization code for access token
      const tokenResponse = await fetch(`${provider.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${provider.clientId}:${provider.clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: provider.redirectUrls[0],
        }),
      })

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}))
        throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorData.error_description || errorData.error || 'Unknown error'}`)
      }

      const tokenData = await tokenResponse.json()
      const { access_token, refresh_token, expires_in, token_type } = tokenData

      if (!access_token) {
        throw new Error('No access token received')
      }

      // Calculate token expiration
      const tokenExpiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null

      // Update provider with OAuth tokens
      const updatedProvider = await prisma.provider.update({
        where: { id: provider.id },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token || null,
          tokenExpiresAt,
          isConnectedToCamInv: true,
          updatedAt: new Date(),
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: providerUser.id,
          action: 'OAUTH_AUTHORIZATION',
          entityType: 'Provider',
          entityId: provider.id,
          description: 'Successfully completed OAuth authorization with CamInvoice',
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      })

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
            isConnectedToCamInv: true,
            updatedAt: new Date(),
          },
        })

        // Create audit log
        await prisma.auditLog.create({
          data: {
            userId: providerUser.id,
            action: 'OAUTH_AUTHORIZATION',
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
          details: error instanceof Error ? error.message : 'Unknown error'
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
