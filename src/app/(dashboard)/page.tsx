import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function DashboardHome() {
  // Server-side authentication check
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('better-auth.session_token')

  // If no session cookie, redirect to login immediately
  if (!sessionToken) {
    redirect('/login?redirect=/')
  }

  // If we have a session, the middleware will handle the role-based redirect
  // This page should never actually render because middleware redirects based on role
  // But we'll add a fallback just in case
  redirect('/portal')
}
