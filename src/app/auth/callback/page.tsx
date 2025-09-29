"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function CamInvoiceAuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [handled, setHandled] = useState(false)

  useEffect(() => {
    if (handled) return

    const doHandle = async () => {
      try {
        const authToken = searchParams.get("authToken") || searchParams.get("auth_token") || searchParams.get("code")
        const state = searchParams.get("state") || undefined
        const error = searchParams.get("error")

        if (error) {
          // If popup, notify opener then close; else go back with error
          if (window.opener) {
            window.opener.postMessage({ source: "caminvoice-oauth", error }, window.location.origin)
            window.close()
            return
          }
          router.push("/provider?tab=setup&oauth=error")
          return
        }

        if (authToken) {
          // Preferred: hand back to opener (popup flow)
          if (window.opener) {
            window.opener.postMessage({ source: "caminvoice-oauth", authToken, state }, window.location.origin)
            window.close()
            return
          }
          // Note: OAuth flow has been simplified to use client credentials directly
          // This fallback is no longer needed for provider setup
          router.push("/provider?tab=setup&oauth=success")
          return
        }

        // If we get here, we couldn't complete the flow
        router.push("/provider?tab=setup&oauth=error")
      } catch {
        router.push("/provider?tab=setup&oauth=error")
      } finally {
        setHandled(true)
      }
    }

    doHandle()
  }, [handled, router, searchParams])

  // Simple minimal UI; popup will close immediately, full-page will redirect
  return null
}

