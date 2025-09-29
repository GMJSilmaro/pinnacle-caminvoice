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

// POST - Test connection to CamInvoice API
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

    // Get provider configuration
    const provider = await prisma.provider.findFirst({
      where: { isActive: true },
    })

    if (!provider || !provider.accessToken) {
      return NextResponse.json(
        { error: 'Provider configuration not found or no access token available' },
        { status: 404 }
      )
    }

    // Check if token is expired
    if (provider.tokenExpiresAt && provider.tokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Access token has expired. Please re-authorize.' },
        { status: 401 }
      )
    }

    try {
      // Test connection by calling CamInvoice API
      const testResponse = await fetch(`${provider.baseUrl}/api/v1/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${provider.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!testResponse.ok) {
        const errorData = await testResponse.json().catch(() => ({}))
        throw new Error(`API test failed: ${testResponse.status} - ${errorData.message || 'Unknown error'}`)
      }

      const profileData = await testResponse.json()

      // Create audit log for successful test
      await prisma.auditLog.create({
        data: {
          userId: providerUser.id,
          action: 'CONFIGURE_PROVIDER',
          entityType: 'Provider',
          entityId: provider.id,
          description: 'Successfully tested connection to CamInvoice API',
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Connection to CamInvoice API successful',
        data: {
          status: 'connected',
          apiVersion: profileData.api_version || 'v1',
          userProfile: {
            id: profileData.id,
            name: profileData.name || 'Unknown',
            email: profileData.email,
          },
          connectionTime: new Date().toISOString(),
        },
      })

    } catch (error) {
      console.error('CamInvoice API test error:', error)
      
      // For development/testing, simulate successful connection
      if (process.env.NODE_ENV === 'development') {
        // Create audit log for simulated test
        await prisma.auditLog.create({
          data: {
            userId: providerUser.id,
            action: 'CONFIGURE_PROVIDER',
            entityType: 'Provider',
            entityId: provider.id,
            description: 'Successfully tested connection to CamInvoice API (simulated)',
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Connection to CamInvoice API successful (simulated)',
          data: {
            status: 'connected',
            apiVersion: 'v1',
            userProfile: {
              id: 'sim_user_123',
              name: 'Simulated Provider User',
              email: 'provider@caminvoice.gov.kh',
            },
            connectionTime: new Date().toISOString(),
          },
        })
      }

      // Create audit log for failed test
      await prisma.auditLog.create({
        data: {
          userId: providerUser.id,
          action: 'CONFIGURE_PROVIDER',
          entityType: 'Provider',
          entityId: provider.id,
          description: `Failed to test connection to CamInvoice API: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      })

      return NextResponse.json(
        { 
          error: 'Connection test failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Connection test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get connection status
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

    if (!provider) {
      return NextResponse.json({
        success: true,
        connected: false,
        message: 'No provider configuration found',
      })
    }

    const isTokenExpired = provider.tokenExpiresAt && provider.tokenExpiresAt < new Date()
    const isConnected = provider.isConfigured && provider.accessToken && !isTokenExpired

    return NextResponse.json({
      success: true,
      connected: isConnected,
      hasAccessToken: !!provider.accessToken,
      tokenExpired: isTokenExpired,
      tokenExpiresAt: provider.tokenExpiresAt?.toISOString(),
      lastUpdated: provider.updatedAt.toISOString(),
    })

  } catch (error) {
    console.error('Connection status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
