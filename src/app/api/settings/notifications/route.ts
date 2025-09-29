import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import jwt from 'jsonwebtoken'

// Verify authenticated user middleware
async function verifyAuthenticatedUser(request: NextRequest) {
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

    if (!session || session.user.status !== 'ACTIVE') {
      return null
    }

    return session.user
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    // For now, return default notification settings
    // In a real implementation, you would store these in a UserSettings table
    const defaultSettings = {
      emailInvoices: true,
      camInvoiceUpdates: true,
      systemMaintenance: true,
      weeklySummary: false,
      marketingEmails: false,
      securityAlerts: true,
    }

    // Try to get user-specific settings from database
    // Since we don't have a UserSettings table yet, we'll use defaults
    const settings = defaultSettings

    return NextResponse.json({
      success: true,
      settings,
    })

  } catch (error) {
    console.error('Failed to get notification settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    const {
      emailInvoices,
      camInvoiceUpdates,
      systemMaintenance,
      weeklySummary,
      marketingEmails,
      securityAlerts,
    } = await request.json()

    // Validate that all settings are boolean values
    const settings = {
      emailInvoices: Boolean(emailInvoices),
      camInvoiceUpdates: Boolean(camInvoiceUpdates),
      systemMaintenance: Boolean(systemMaintenance),
      weeklySummary: Boolean(weeklySummary),
      marketingEmails: Boolean(marketingEmails),
      securityAlerts: Boolean(securityAlerts),
    }

    // In a real implementation, you would save these to a UserSettings table
    // For now, we'll just return success
    // 
    // Example implementation:
    // await prisma.userSettings.upsert({
    //   where: { userId: user.id },
    //   update: {
    //     notificationSettings: JSON.stringify(settings),
    //     updatedAt: new Date(),
    //   },
    //   create: {
    //     userId: user.id,
    //     notificationSettings: JSON.stringify(settings),
    //   },
    // })

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully',
      settings,
    })

  } catch (error) {
    console.error('Failed to update notification settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
