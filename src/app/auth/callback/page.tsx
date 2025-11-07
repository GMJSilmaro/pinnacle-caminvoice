"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { exchangeAuthToken } from "@/app/provider/actions";

function CamInvoiceAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    if (handled) return;

    const doHandle = async () => {
      try {
        const findToken = () => {
          const keys = [
            "authToken",
            "auth_token",
            "code",
            "authCode",
            "auth_code",
            "authorization_code",
            "token",
          ] as const;
          for (const k of keys) {
            const v = searchParams.get(k as any);
            if (v) return v;
          }
          return null;
        };
        const authToken = findToken();
        const state = searchParams.get("state") || undefined;
        const error = searchParams.get("error");

        if (error) {
          // If popup, notify opener then close; else go back with error
          if (window.opener) {
            // Post to opener regardless of origin; opener will validate event.origin
            window.opener.postMessage(
              {
                source: "caminvoice-oauth",
                error,
                origin: window.location.origin,
              },
              "*"
            );
            window.close();
            return;
          }
          router.push("/provider?tab=setup&oauth=error");
          return;
        }

        if (authToken) {
          // Preferred: hand back to opener (popup flow)
          if (window.opener) {
            // Post to opener regardless of origin; opener will validate event.origin
            window.opener.postMessage(
              {
                source: "caminvoice-oauth",
                authToken,
                state,
                origin: window.location.origin,
              },
              "*"
            );
            window.close();
            return;
          }

          // Fallback: if popup lost opener (COOP/rel=noopener), complete exchange here
          try {
            await exchangeAuthToken({ authToken, state });
            router.push("/provider?tab=setup&oauth=success");
          } catch {
            router.push("/provider?tab=setup&oauth=error");
          }
          return;
        }

        // If we get here, we couldn't complete the flow
        router.push("/provider?tab=setup&oauth=error");
      } catch {
        router.push("/provider?tab=setup&oauth=error");
      } finally {
        setHandled(true);
      }
    };

    doHandle();
  }, [handled, router, searchParams]);

  // Simple minimal UI; popup will close immediately, full-page will redirect
  return null;
}

export default function CamInvoiceAuthCallback() {
  return (
    <Suspense fallback={null}>
      <CamInvoiceAuthCallbackContent />
    </Suspense>
  );
}

