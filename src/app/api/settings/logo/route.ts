import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthentication, verifyTenantAdminRole, createErrorResponse, AuthErrors } from '@/lib/tenant-middleware'

const MAX_BYTES = 1024 * 1024; // 1MB
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/svg+xml']);

function toDataUrl(mime: string, bytes: Buffer) {
  const base64 = bytes.toString('base64')
  return `data:${mime};base64,${base64}`
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthentication(request)
    if (!user) {
      const e = createErrorResponse(AuthErrors.UNAUTHORIZED)
      return NextResponse.json({ error: e.error }, { status: e.status })
    }

    let tenantId: string | null = null
    if (user.role === 'PROVIDER') {
      tenantId = request.nextUrl.searchParams.get('tenantId')
      if (!tenantId) {
        return NextResponse.json({ error: 'Tenant ID required for provider access.' }, { status: 400 })
      }
    } else {
      tenantId = user.tenantId || null
    }

    if (!tenantId) {
      return NextResponse.json({ hasLogo: false })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { logoBytes: true, logoMimeType: true, logoUpdatedAt: true },
    })

    if (!tenant || !tenant.logoBytes || !tenant.logoMimeType) {
      return NextResponse.json({ hasLogo: false })
    }

    const dataUrl = toDataUrl(tenant.logoMimeType, Buffer.from(tenant.logoBytes))
    return NextResponse.json({ hasLogo: true, dataUrl, updatedAt: tenant.logoUpdatedAt })
  } catch (err) {
    console.error('GET /api/settings/logo failed', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyTenantAdminRole(request)
    if (!user) {
      const e = createErrorResponse(AuthErrors.TENANT_ADMIN_REQUIRED)
      return NextResponse.json({ error: e.error }, { status: e.status })
    }

    let targetTenantId: string | null = null
    if (user.role === 'PROVIDER') {
      targetTenantId = request.nextUrl.searchParams.get('tenantId')
      if (!targetTenantId) {
        return NextResponse.json({ error: 'Tenant ID required for provider action.' }, { status: 400 })
      }
    } else {
      targetTenantId = user.tenantId || null
    }

    if (!targetTenantId) {
      return NextResponse.json({ error: 'No tenant associated with user.' }, { status: 400 })
    }

    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use SVG, PNG, or JPG.' }, { status: 415 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large. Max 1MB.' }, { status: 413 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buf = Buffer.from(arrayBuffer)

    const updated = await prisma.tenant.update({
      where: { id: targetTenantId },
      data: {
        logoBytes: buf,
        logoMimeType: file.type,
        logoUpdatedAt: new Date(),
        updatedAt: new Date(),
      },
      select: { logoMimeType: true, logoBytes: true, logoUpdatedAt: true },
    })

    const dataUrl = toDataUrl(updated.logoMimeType!, Buffer.from(updated.logoBytes!))

    return NextResponse.json({ success: true, dataUrl, updatedAt: updated.logoUpdatedAt })
  } catch (err) {
    console.error('POST /api/settings/logo failed', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

