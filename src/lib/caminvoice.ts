/**
 * CamInvoice API Wrapper (server-usable)
 *
 * Rules followed:
 * - No custom Next.js API endpoints; call CamInvoice directly from server components/actions.
 * - OAuth2 and API calls centralized here.
 * - Returns raw JSON responses for flexibility.
 *
 * Base URL: defaults to sandbox. Override via env CAMINVOICE_BASE_URL or per-call baseUrl.
 */

const CAMINVOICE_DEFAULT_BASE_URL =
  process.env.CAMINVOICE_BASE_URL?.trim() || 'https://sandbox.e-invoice.gov.kh'

type JsonRecord = Record<string, any>

export interface GetAccessTokenParams {
  clientId: string
  clientSecret: string
  baseUrl?: string
}

export interface RefreshAccessTokenParams {
  clientId: string
  clientSecret: string
  refreshToken: string
  baseUrl?: string
}

export interface SubmitInvoiceParams {
  accessToken: string
  invoiceXml: string
  baseUrl?: string
}

export interface GetInvoiceStatusParams {
  accessToken: string
  invoiceId: string
  baseUrl?: string
}

export interface CancelInvoiceParams {
  accessToken: string
  invoiceId: string
  baseUrl?: string
}

// Minimal token response shape (actual may contain more fields per official docs)
export interface TokenResponse {
  access_token: string
  token_type?: string
  expires_in?: number
  refresh_token?: string
  scope?: string
  [k: string]: any
}

async function throwDetailedError(res: Response): Promise<never> {
  const contentType = res.headers.get('content-type') || ''
  let details = ''
  try {
    if (contentType.includes('application/json')) {
      const j = await res.json()
      details = JSON.stringify(j)
    } else {
      details = await res.text()
    }
  } catch {
    // ignore parse errors
  }
  const message = `CamInvoice API error ${res.status} ${res.statusText}${
    details ? ` - ${details}` : ''
  }`
  throw new Error(message)
}

async function parseJsonOrText(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || ''
  if (!res.ok) return throwDetailedError(res)
  if (contentType.includes('application/json')) return res.json()
  // Fallback: return text for non-JSON responses
  return res.text()
}

/** OAuth2: Client Credentials */
export async function getAccessToken(
  params: GetAccessTokenParams
): Promise<TokenResponse> {
  const { clientId, clientSecret, baseUrl = CAMINVOICE_DEFAULT_BASE_URL } = params

  const res = await fetch(`${baseUrl}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: 'no-store',
  })

  const data = await parseJsonOrText(res)
  return data as TokenResponse
}

/** OAuth2: Refresh Token */
export async function refreshAccessToken(
  params: RefreshAccessTokenParams
): Promise<TokenResponse> {
  const { clientId, clientSecret, refreshToken, baseUrl = CAMINVOICE_DEFAULT_BASE_URL } = params

  const res = await fetch(`${baseUrl}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: 'no-store',
  })

  const data = await parseJsonOrText(res)
  return data as TokenResponse
}

/** Invoices: Submit (XML) */
export async function submitInvoice(
  params: SubmitInvoiceParams
): Promise<JsonRecord> {
  const { accessToken, invoiceXml, baseUrl = CAMINVOICE_DEFAULT_BASE_URL } = params

  const res = await fetch(`${baseUrl}/invoices`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/xml',
    },
    body: invoiceXml,
    cache: 'no-store',
  })

  return parseJsonOrText(res)
}

/** Invoices: Get status */
export async function getInvoiceStatus(
  params: GetInvoiceStatusParams
): Promise<JsonRecord> {
  const { accessToken, invoiceId, baseUrl = CAMINVOICE_DEFAULT_BASE_URL } = params

  const res = await fetch(`${baseUrl}/invoices/${encodeURIComponent(invoiceId)}/status`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  return parseJsonOrText(res)
}

/** Invoices: Cancel */
export async function cancelInvoice(
  params: CancelInvoiceParams
): Promise<JsonRecord> {
  const { accessToken, invoiceId, baseUrl = CAMINVOICE_DEFAULT_BASE_URL } = params

  const res = await fetch(`${baseUrl}/invoices/${encodeURIComponent(invoiceId)}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  return parseJsonOrText(res)
}

export const CaminvoiceApi = {
  getAccessToken,
  refreshAccessToken,
  submitInvoice,
  getInvoiceStatus,
  cancelInvoice,
}

