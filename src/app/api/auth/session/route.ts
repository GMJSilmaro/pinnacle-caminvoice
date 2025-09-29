import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('better-auth.session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({ user: null, session: null })
    }

    // Verify JWT token
    let decoded: any
    try {
      decoded = jwt.verify(sessionToken, process.env.BETTER_AUTH_SECRET!)
    } catch (error) {
      // Invalid token, clear cookie
      cookieStore.delete('better-auth.session_token')
      return NextResponse.json({ user: null, session: null })
    }

    // Find session in database
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: {
        user: {
          include: {
            tenant: true,
          },
        },
      },
    })

    if (!session || session.expiresAt < new Date()) {
      // Session expired or not found, clear cookie
      cookieStore.delete('better-auth.session_token')
      return NextResponse.json({ user: null, session: null })
    }

    // Check if user is still active
    if (session.user.status !== 'ACTIVE') {
      cookieStore.delete('better-auth.session_token')
      return NextResponse.json({ user: null, session: null })
    }

    // Return user data (excluding password)
    const userData = {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      role: session.user.role,
      status: session.user.status,
      tenantId: session.user.tenantId,
      tenant: session.user.tenant,
    }

    return NextResponse.json({
      user: userData,
      session: {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
      },
    })

  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ user: null, session: null })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('better-auth.session_token')?.value

    if (sessionToken) {
      // Delete session from database
      await prisma.session.deleteMany({
        where: { token: sessionToken },
      })
    }

    // Clear session cookie
    cookieStore.delete('better-auth.session_token')

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
