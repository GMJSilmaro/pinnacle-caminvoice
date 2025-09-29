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

// GET - Get current provider configuration
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
        provider: null,
        isSetup: false,
      })
    }

    // Return configuration (without sensitive data)
    return NextResponse.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
        baseUrl: provider.baseUrl,
        isConnectedToCamInv: provider.isConfigured,
        status: provider.isActive ? 'ACTIVE' : 'INACTIVE',
        redirectUrls: provider.redirectUrls,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
      },
      isSetup: provider.isConfigured,
    })

  } catch (error) {
    console.error('Provider setup fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Save provider configuration
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
    const {
      clientId,
      clientSecret,
      baseUrl,
      description,
      redirectUrls,
      accessToken,
      refreshToken,
      tokenExpiresAt,
    } = data

    // Validate required fields
    if (!clientId || !clientSecret || !baseUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, clientSecret, baseUrl' },
        { status: 400 }
      )
    }

    // Check if provider already exists
    let existingProvider = await prisma.provider.findFirst({
      where: { isActive: true },
    })

    let provider
    let isUpdate = false

    if (existingProvider) {
      // Update existing provider
      isUpdate = true
      provider = await prisma.provider.update({
        where: { id: existingProvider.id },
        data: {
          clientId,
          clientSecret, // In production, this should be encrypted
          baseUrl,
          description: description || null,
          redirectUrls: redirectUrls || [],
          accessToken: accessToken || null,
          refreshToken: refreshToken || null,
          tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
          isConfigured: !!accessToken,
          updatedAt: new Date(),
        },
      })
    } else {
      // Create new provider
      provider = await prisma.provider.create({
        data: {
          name: 'Pinnacle CamInvoice Provider',
          clientId,
          clientSecret, // In production, this should be encrypted
          baseUrl,
          description: description || null,
          redirectUrls: redirectUrls || [],
          accessToken: accessToken || null,
          refreshToken: refreshToken || null,
          tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
          isConfigured: !!accessToken,
          isActive: true,
        },
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: providerUser.id,
        action: 'CONFIGURE_PROVIDER',
        entityType: 'Provider',
        entityId: provider.id,
        description: `${isUpdate ? 'Updated' : 'Created'} CamInvoice provider configuration`,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    })

    return NextResponse.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
        baseUrl: provider.baseUrl,
        isConnectedToCamInv: provider.isConfigured,
        status: provider.isActive ? 'ACTIVE' : 'INACTIVE',
        redirectUrls: provider.redirectUrls,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
      },
    })

  } catch (error) {
    console.error('Provider setup save error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update provider OAuth tokens
export async function PUT(request: NextRequest) {
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
    const { accessToken, refreshToken, tokenExpiresAt } = data

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      )
    }

    // Find and update provider
    const provider = await prisma.provider.findFirst({
      where: { isActive: true },
    })

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider configuration not found' },
        { status: 404 }
      )
    }

    const updatedProvider = await prisma.provider.update({
      where: { id: provider.id },
      data: {
        accessToken,
        refreshToken: refreshToken || null,
        tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
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
        description: 'Updated CamInvoice OAuth tokens',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    })

    return NextResponse.json({
      success: true,
      provider: {
        id: updatedProvider.id,
        name: updatedProvider.name,
        baseUrl: updatedProvider.baseUrl,
        isConnectedToCamInv: updatedProvider.isConfigured,
        status: updatedProvider.isActive ? 'ACTIVE' : 'INACTIVE',
        redirectUrls: updatedProvider.redirectUrls,
        createdAt: updatedProvider.createdAt,
        updatedAt: updatedProvider.updatedAt,
      },
    })

  } catch (error) {
    console.error('Provider OAuth update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
