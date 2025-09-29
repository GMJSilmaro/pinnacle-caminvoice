---
type: "always_apply"
---

📌 Proposed .md file structure
	•	Intro + Rules
	•	OAuth2 Handling
	•	Get access token
	•	Refresh token
	•	Store in DB
	•	Invoice APIs
	•	Submit invoice
	•	Get invoice status
	•	Cancel invoice
	•	Folder Structure
	•	Code Patterns

⸻

Here’s the draft .md content (you can keep appending as you integrate more endpoints):

# Augmented Code AI Rules for CamInvoice Integration (Next.js 15)

## 1. No Custom API Endpoints
❌ Do *NOT* create any Next.js API endpoints inside /app/api/....
- We will not use custom API routes for CamInvoice.
- All OAuth2 and API fetch logic must live in /src/lib/.

---

## 2. API Wrapper in /lib
✅ Always create API wrapper utilities in /src/lib/caminvoice.ts.

Functions must:
- Accept clientId, clientSecret, and optionally refreshToken (from DB).
- Return raw API JSON responses.
- Be reusable by all tenants.

---

## 3. OAuth2 Rules
CamInvoice uses *OAuth2 Client Credentials / Refresh Token flow*.

### Get Access Token
```ts
export async function getAccessToken({
  clientId,
  clientSecret,
}: {
  clientId: string;
  clientSecret: string;
}) {
  const res = await fetch("https://sandbox.e-invoice.gov.kh/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to get token");
  return res.json(); // contains access_token, expires_in, etc.
}

Refresh Access Token

export async function refreshAccessToken({
  clientId,
  clientSecret,
  refreshToken,
}: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}) {
  const res = await fetch("https://sandbox.e-invoice.gov.kh/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to refresh token");
  return res.json();
}


⸻

4. Invoice APIs

Always pass the tenant’s access_token.

Submit Invoice

export async function submitInvoice({
  accessToken,
  invoiceXml,
}: {
  accessToken: string;
  invoiceXml: string;
}) {
  const res = await fetch("https://sandbox.e-invoice.gov.kh/invoices", {
    method: "POST",
    headers: {
      "Authorization": Bearer ${accessToken},
      "Content-Type": "application/xml",
    },
    body: invoiceXml,
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to submit invoice");
  return res.json();
}

Get Invoice Status

export async function getInvoiceStatus({
  accessToken,
  invoiceId,
}: {
  accessToken: string;
  invoiceId: string;
}) {
  const res = await fetch(
    https://sandbox.e-invoice.gov.kh/invoices/${invoiceId}/status,
    {
      headers: { Authorization: Bearer ${accessToken} },
      cache: "no-store",
    }
  );

  if (!res.ok) throw new Error("Failed to get invoice status");
  return res.json();
}

Cancel Invoice

export async function cancelInvoice({
  accessToken,
  invoiceId,
}: {
  accessToken: string;
  invoiceId: string;
}) {
  const res = await fetch(
    https://sandbox.e-invoice.gov.kh/invoices/${invoiceId}/cancel,
    {
      method: "POST",
      headers: { Authorization: Bearer ${accessToken} },
      cache: "no-store",
    }
  );

  if (!res.ok) throw new Error("Failed to cancel invoice");
  return res.json();
}


⸻

5. Folder Structure

/src
  /lib
    caminvoice.ts    <-- API wrapper (OAuth2 + invoices)
  /app
    /dashboard
      page.tsx       <-- fetches tenant credentials from DB, calls lib
  /lib/db.ts         <-- Prisma or DB connector


⸻

6. Usage Example (Server Component)

import { getAccessToken, submitInvoice } from "@/lib/caminvoice";
import db from "@/lib/db";

export default async function DashboardPage() {
  const tenant = await db.tenant.findFirst();

  const token = await getAccessToken({
    clientId: tenant.caminvoiceClientId,
    clientSecret: tenant.caminvoiceClientSecret,
  });

  const response = await submitInvoice({
    accessToken: token.access_token,
    invoiceXml: "<Invoice>...</Invoice>",
  });

  return <pre>{JSON.stringify(response, null, 2)}</pre>;
}

---