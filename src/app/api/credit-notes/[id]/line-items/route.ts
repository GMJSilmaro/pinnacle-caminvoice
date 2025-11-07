import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { verifyAuthentication, AuthErrors, createErrorResponse } from '../../../../../lib/tenant-middleware'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyAuthentication(request)
    if (!user) {
      const err = createErrorResponse(AuthErrors.UNAUTHORIZED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }

    const { id } = await params
    const note = await prisma.creditNote.findFirst({ where: { id, ...(user.role === 'PROVIDER' ? {} : { tenantId: user.tenantId! }) }, select: { id: true } })
    if (!note) return NextResponse.json({ error: 'Credit note not found' }, { status: 404 })

    const items = await prisma.creditNoteLineItem.findMany({ where: { creditNoteId: id }, orderBy: { id: 'asc' } })
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('GET credit note line items error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyAuthentication(request)
    if (!user) {
      const err = createErrorResponse(AuthErrors.UNAUTHORIZED)
      return NextResponse.json({ error: err.error }, { status: err.status })
    }
    const { id } = await params
    const note = await prisma.creditNote.findFirst({ where: { id, ...(user.role === 'PROVIDER' ? {} : { tenantId: user.tenantId! }) }, select: { id: true, currency: true } })
    if (!note) return NextResponse.json({ error: 'Credit note not found' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const input = (body?.lineItems || []) as Array<{ description: string; quantity: number; unitPrice: number; taxRate: number }>
    if (!Array.isArray(input) || input.length === 0) return NextResponse.json({ error: 'lineItems array required' }, { status: 400 })

    // Build rows with computed totals
    const rows = input.map((li) => {
      const quantity = Number(li.quantity) || 0
      const unitPrice = Number(li.unitPrice) || 0
      const taxRate = Number(li.taxRate) || 0
      const lineTotal = +(quantity * unitPrice).toFixed(2)
      const taxAmount = +(lineTotal * taxRate).toFixed(2)
      return { description: String(li.description || ''), quantity, unitPrice, lineTotal, taxRate, taxAmount }
    })

    await prisma.$transaction([
      prisma.creditNoteLineItem.deleteMany({ where: { creditNoteId: id } }),
      // createMany doesn't support returning created rows in sqlite; fine
      prisma.creditNoteLineItem.createMany({ data: rows.map((r) => ({ ...r, creditNoteId: id })) }),
    ])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('PUT credit note line items error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

