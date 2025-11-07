import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { PrismaClient } from "../generated/prisma"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disable for development
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  user: {
    additionalFields: {
      firstName: {
        type: "string",
        required: true,
      },
      lastName: {
        type: "string",
        required: true,
      },
      role: {
        type: "string",
        required: true,
        defaultValue: "TENANT_USER",
      },
      status: {
        type: "string",
        required: true,
        defaultValue: "ACTIVE",
      },
      tenantId: {
        type: "string",
        required: false,
      },
    },
  },
  trustedOrigins: ["http://localhost:3000", "https://sandbox.e-invoice.gov.kh"],
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL,
})

// Helper functions for authentication
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12)
}

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword)
}

// Role-based access control helpers
export const hasRole = (userRole: string, requiredRole: string): boolean => {
  const roleHierarchy = {
    PROVIDER: 3,
    TENANT_ADMIN: 2,
    TENANT_USER: 1,
  }
  
  return (roleHierarchy[userRole as keyof typeof roleHierarchy] || 0) >= 
         (roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0)
}

export const canAccessTenant = (userTenantId: string | null, targetTenantId: string): boolean => {
  // Provider users can access all tenants
  if (!userTenantId) return true
  // Tenant users can only access their own tenant
  return userTenantId === targetTenantId
}

// Types for better TypeScript support
export type AuthUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: "PROVIDER" | "TENANT_ADMIN" | "TENANT_USER"
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED"
  tenantId?: string | null
  tenant?: {
    id: string
    name: string
    status: string
  } | null
}

export type AuthSession = {
  user: AuthUser
  session: {
    id: string
    userId: string
    expiresAt: Date
  }
}
