import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { hashPassword } from '../../../../lib/auth'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, companyName, role = 'TENANT_ADMIN' } = await request.json()

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create tenant if this is a tenant admin registration
    let tenantId: string | null = null
    if (role === 'TENANT_ADMIN' && companyName) {
      const tenant = await prisma.tenant.create({
        data: {
          name: companyName,
          businessName: companyName,
          taxId: `TEMP-${Date.now()}`, // Temporary tax ID, to be updated later
          email: email,
          phone: '',
          address: '',
          city: '',
          country: 'Cambodia',
          status: 'PENDING',
        },
      })
      tenantId = tenant.id
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role: role as any,
        status: 'ACTIVE',
        tenantId,
      },
      include: {
        tenant: true,
      },
    })

    // Create session token
    const sessionToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      process.env.BETTER_AUTH_SECRET!,
      { expiresIn: '7d' }
    )

    // Create session in database
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('better-auth.session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    // Return user data (excluding password)
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
      tenant: user.tenant,
    }

    return NextResponse.json({
      success: true,
      user: userData,
      session: {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
      },
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
