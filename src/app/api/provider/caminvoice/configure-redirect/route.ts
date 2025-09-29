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

// POST - Configure redirect URLs with CamInvoice
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
    const { redirectUrls } = data

    if (!redirectUrls || !Array.isArray(redirectUrls) || redirectUrls.length === 0) {
      return NextResponse.json(
        { error: 'Redirect URLs are required' },
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
      // Call CamInvoice API to configure redirect URLs (try a few likely paths)
      const base = provider.baseUrl.replace(/\/+$/, '')
      const basic = Buffer.from(`${provider.clientId}:${provider.clientSecret}`).toString('base64')
      const candidatePaths = [
        '/api/v1/configure/redirect-url',
        '/api/v1/configure/redirect-urls',
        '/api/v1/configure/configure-redirect-url',
      ]

      let camInvoiceResponse: Response | null = null
      let attempted = [] as string[]

      for (const path of candidatePaths) {
        const url = `${base}${path}`
        attempted.push(url)
        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${basic}`,
            },
            body: JSON.stringify({
              client_id: provider.clientId,
              redirect_uris: redirectUrls,
            }),
          })
          if (resp.status === 404) {
            // Try next candidate
            continue
          }
          camInvoiceResponse = resp
          break
        } catch (e) {
          // Network error, try next
          continue
        }
      }

      if (!camInvoiceResponse) {
        throw new Error(`CamInvoice configure endpoint not found. Tried: ${attempted.join(', ')}`)
      }

      if (!camInvoiceResponse.ok) {
        const raw = await camInvoiceResponse.text().catch(() => '')
        throw new Error(`CamInvoice API error: ${camInvoiceResponse.status} - ${raw.slice(0, 200)}`)
      }

      const contentType = camInvoiceResponse.headers.get('content-type') || ''
      const camInvoiceData = contentType.includes('application/json')
        ? await camInvoiceResponse.json().catch(() => ({ raw: 'invalid-json' }))
        : { raw: await camInvoiceResponse.text().catch(() => '') }

      // Update provider with configured redirect URLs
      await prisma.provider.update({
        where: { id: provider.id },
        data: {
          redirectUrls,
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
          description: `Configured redirect URLs with CamInvoice: ${redirectUrls.join(', ')}`,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Redirect URLs configured successfully',
        data: camInvoiceData,
      })

    } catch (error) {
      console.error('CamInvoice API error:', error)
      
      // For development/testing, we'll simulate success if CamInvoice API is not available
      if (process.env.NODE_ENV === 'development') {
        // Update provider with configured redirect URLs (simulation)
        await prisma.provider.update({
          where: { id: provider.id },
          data: {
            redirectUrls,
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
            description: `Configured redirect URLs (simulated): ${redirectUrls.join(', ')}`,
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Redirect URLs configured successfully (simulated)',
          data: {
            client_id: provider.clientId,
            redirect_uris: redirectUrls,
            status: 'configured',
          },
        })
      }

      return NextResponse.json(
        { 
          error: 'Failed to configure redirect URLs with CamInvoice',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Configure redirect URLs error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
