'use client'

import { useEffect, useState } from 'react'
import { AuthUser, AuthSession } from '../lib/auth'

interface UseAuthReturn {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  hasRole: (role: string) => boolean
  canAccessTenant: (tenantId: string) => boolean
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  companyName?: string
  role?: string
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  // Check authentication status on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      })
      
      if (response.ok) {
        const sessionData = await response.json()
        if (sessionData.user) {
          setUser(sessionData.user)
          setSession(sessionData)
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/custom-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success && data.user) {
        setUser(data.user)
        setSession(data)
        return { success: true }
      } else {
        return { success: false, error: data.error || 'Login failed' }
      }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  const register = async (registerData: RegisterData) => {
    try {
      const response = await fetch('/api/auth/custom-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.success && data.user) {
        setUser(data.user)
        setSession(data)
        return { success: true }
      } else {
        return { success: false, error: data.error || 'Registration failed' }
      }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/session', {
        method: 'DELETE',
        credentials: 'include',
      })
      setUser(null)
      setSession(null)
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const hasRole = (requiredRole: string): boolean => {
    if (!user) return false
    
    const roleHierarchy = {
      PROVIDER: 3,
      TENANT_ADMIN: 2,
      TENANT_USER: 1,
    }
    
    return (roleHierarchy[user.role as keyof typeof roleHierarchy] || 0) >= 
           (roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0)
  }

  const canAccessTenant = (targetTenantId: string): boolean => {
    if (!user) return false
    // Provider users can access all tenants
    if (!user.tenantId) return true
    // Tenant users can only access their own tenant
    return user.tenantId === targetTenantId
  }

  return {
    user,
    session,
    loading,
    login,
    register,
    logout,
    hasRole,
    canAccessTenant,
  }
}
