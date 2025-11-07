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
  process.env.CAMINVOICE_BASE_URL?.trim() ||
  "https://sb-merchant.e-invoice.gov.kh";

type JsonRecord = Record<string, any>;

export interface RefreshAccessTokenParams {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  baseUrl?: string;
}

export interface SubmitInvoiceParams {
  accessToken: string;
  invoiceXml: string;
  baseUrl?: string;
  documentType?: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE'; // Defaults to 'INVOICE' for backward compatibility
}

export interface GetInvoiceStatusParams {
  accessToken: string;
  invoiceId: string;
  baseUrl?: string;
}

export interface CancelInvoiceParams {
  accessToken: string;
  invoiceId: string;
  baseUrl?: string;
}
export interface ValidateTaxpayerParams {
  accessToken: string;
  singleId: string;
  tin: string;
  companyNameEn: string;
  companyNameKh: string;
  baseUrl?: string;
}

export interface ValidateTaxpayerResponse {
  is_valid: boolean;
  [k: string]: any;
}

// Get Member Detail by endpoint_id (CamInvoice ID)
export interface GetMemberDetailParams {
  accessToken: string;
  endpointId: string; 
  baseUrl?: string;
}

export interface MemberDetailResponse {
  endpoint_id: string;
  endpoint_name?: string;
  company_name_en?: string;
  company_name_kh?: string;
  entity_type?: string;
  entity_id?: string;
  tin?: string;
  country?: string;
  [k: string]: any;
}

// Document delivery parameters (Send Documents API)
export interface SendDocumentsParams {
  accessToken: string;
  documentIds: string[];
  baseUrl?: string;
}

export interface SendDocumentsResponse {
  sent_documents: string[];
  failed_documents: Array<{
    document_id: string;
    message: string;
  }>;
}

// Document detail retrieval parameters
export interface GetDocumentDetailParams {
  accessToken: string;
  documentId: string;
  baseUrl?: string;
}

export interface DocumentDetailResponse {
  document_id: string;
  document_number: string;
  supplier_id: string;
  supplier_company_name_kh: string;
  supplier_company_name_en: string;
  supplier_vattin: string;
  customer_id: string;
  customer_company_name_en: string;
  customer_company_name_kh: string;
  customer_vattin: string;
  status: string; // VALID, DELIVERED, ACKNOWLEDGED, IN_PROCESS, UNDER_QUERY, CONDITIONALLY_ACCEPTED, ACCEPTED, REJECTED, PAID
  issue_date: string;
  due_date: string;
  pdf_file: string;
  created_at: string;
  updated_at: string;
  currency: string;
  tax_inclusive_amount: number;
  document_type: string;
  reference_document_id: string | null;
  reference_document_number: string | null;
  [k: string]: any;
}

// Official polling parameters
export interface PollDocumentsParams {
  accessToken: string;
  lastSyncedAt?: string; // ISO timestamp
  baseUrl?: string;
}

export interface PollDocumentEvent {
  document_id: string;
  updated_at: string;
  type: 'SEND' | 'RECEIVE';
}

export interface PollDocumentsResponse {
  documents: PollDocumentEvent[];
}

// Minimal token response shape (actual may contain more fields per official docs)
export interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  [k: string]: any;
}

async function throwDetailedError(res: Response): Promise<never> {
  const contentType = res.headers.get("content-type") || "";
  let details = "";
  try {
    if (contentType.includes("application/json")) {
      const j = await res.json();
      details = JSON.stringify(j);
    } else {
      details = await res.text();
    }
  } catch {
    // ignore parse errors
  }
  const message = `CamInvoice API error ${res.status} ${res.statusText}${
    details ? ` - ${details}` : ""
  }`;
  throw new Error(message);
}

async function parseJsonOrText(res: Response): Promise<any> {
  const contentType = res.headers.get("content-type") || "";
  if (!res.ok) return throwDetailedError(res);
  if (contentType.includes("application/json")) return res.json();
  // Fallback: return text for non-JSON responses
  return res.text();
}

/** Authentication endpoint: exchange refresh token (POST {BaseURL}/api/v1/auth/token) */
export async function authTokenWithRefresh(
  params: RefreshAccessTokenParams
): Promise<TokenResponse> {
  const {
    clientId,
    clientSecret,
    refreshToken,
    baseUrl = CAMINVOICE_DEFAULT_BASE_URL,
  } = params;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${baseUrl}/api/v1/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basic}`,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });

  const data = await parseJsonOrText(res);
  return data as TokenResponse;
}

/** Invoices: Submit (XML) */
export async function submitInvoice(
  params: SubmitInvoiceParams
): Promise<JsonRecord> {
  const {
    accessToken,
    invoiceXml,
    baseUrl = CAMINVOICE_DEFAULT_BASE_URL,
    documentType = 'INVOICE',
  } = params;

  // Convert XML to Base64 as required by the API
  const xmlBase64 = Buffer.from(invoiceXml, 'utf-8').toString('base64');

  const res = await fetch(`${baseUrl}/api/v1/document`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      documents: [
        {
          document_type: documentType,
          document: xmlBase64,
        },
      ],
    }),
    cache: "no-store",
  });

  return parseJsonOrText(res);
}

/** Invoices: Get status */
export async function getInvoiceStatus(
  params: GetInvoiceStatusParams
): Promise<JsonRecord> {
  const {
    accessToken,
    invoiceId,
    baseUrl = CAMINVOICE_DEFAULT_BASE_URL,
  } = params;

  const res = await fetch(
    `${baseUrl}/invoices/${encodeURIComponent(invoiceId)}/status`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  return parseJsonOrText(res);
}

/** Invoices: Cancel */
export async function cancelInvoice(
  params: CancelInvoiceParams
): Promise<JsonRecord> {
  const {
    accessToken,
    invoiceId,
    baseUrl = CAMINVOICE_DEFAULT_BASE_URL,
  } = params;

  const res = await fetch(
    `${baseUrl}/invoices/${encodeURIComponent(invoiceId)}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  return parseJsonOrText(res);
}

/** Business: Validate taxpayer */
export async function validateTaxpayer(
  params: ValidateTaxpayerParams
): Promise<ValidateTaxpayerResponse> {
  const {
    accessToken,
    singleId,
    tin,
    companyNameEn,
    companyNameKh,
    baseUrl = CAMINVOICE_DEFAULT_BASE_URL,
  } = params;

  const res = await fetch(`${baseUrl}/api/v1/business/validate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      single_id: singleId,
      tin,
      company_name_en: companyNameEn,
      company_name_kh: companyNameKh,
    }),
    cache: "no-store",
  });

  return parseJsonOrText(res);
}

/** Business: Get member detail by endpoint_id */
export async function getMemberDetailByEndpoint (
  params: GetMemberDetailParams
): Promise<MemberDetailResponse> {
  const {
    accessToken,
    endpointId,
    baseUrl = CAMINVOICE_DEFAULT_BASE_URL,
  } = params;

  const res = await fetch(
    `${baseUrl}/api/v1/business/${encodeURIComponent(endpointId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  return parseJsonOrText(res);
}

export interface ProbeTokenParams {
  accessToken: string;
  baseUrl?: string;
}

/** Lightweight probe to verify whether a bearer token is accepted
 * We intentionally call an endpoint with an invalid ID. If we get 401, token is invalid.
 * Any other HTTP status (200/400/404) indicates the token was accepted by auth middleware.
 */
export async function probeToken(params: ProbeTokenParams): Promise<{
  ok: boolean;
  status: number;
  outcome: "valid" | "invalid" | "unknown";
  message: string;
}> {
  const { accessToken, baseUrl = CAMINVOICE_DEFAULT_BASE_URL } = params;
  try {
    const res = await fetch(`${baseUrl}/invoices/invalid-token-probe/status`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.status === 401) {
      return {
        ok: false,
        status: res.status,
        outcome: "invalid",
        message: "Unauthorized (token rejected)",
      };
    }
    return {
      ok: true,
      status: res.status,
      outcome: "valid",
      message: res.statusText,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      outcome: "unknown",
      message: err?.message || "Network error",
    };
  }
}

/** Download PDF from CamInvoice */
export async function downloadDocumentPdf(params: {
  accessToken: string;
  documentId: string;
  baseUrl?: string;
}): Promise<ArrayBuffer> {
  const {
    accessToken,
    documentId,
    baseUrl = CAMINVOICE_DEFAULT_BASE_URL,
  } = params;

  const res = await fetch(`${baseUrl}/api/v1/document/${documentId}/pdf`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    await throwDetailedError(res);
  }

  return res.arrayBuffer();
}

/** Send documents to customers via CamInvoice network (official Send Documents API) */
export async function sendDocuments(params: SendDocumentsParams): Promise<SendDocumentsResponse> {
  const {
    accessToken,
    documentIds,
    baseUrl = CAMINVOICE_DEFAULT_BASE_URL,
  } = params;

  const res = await fetch(`${baseUrl}/api/v1/document/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      documents: documentIds,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to send documents: HTTP ${res.status} ${res.statusText}`);
  }

  const result = await res.json();
  return {
    sent_documents: result.sent_documents || [],
    failed_documents: result.failed_documents || [],
  };
}

/** Get document detail and current status */
export async function getDocumentDetail(params: GetDocumentDetailParams): Promise<DocumentDetailResponse> {
  const {
    accessToken,
    documentId,
    baseUrl = CAMINVOICE_DEFAULT_BASE_URL,
  } = params;

  const res = await fetch(`${baseUrl}/api/v1/document/${documentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    // Get error details from response
    let errorDetails = `HTTP ${res.status} ${res.statusText}`;
    try {
      const errorBody = await res.json();
      errorDetails += ` - ${JSON.stringify(errorBody)}`;
    } catch {
      // If we can't parse the error response, just use the status
    }

    console.error(`CamInvoice API Error for document ${documentId}:`, errorDetails);
    throw new Error(`Failed to get document detail: ${errorDetails}`);
  }

  const result = await res.json();
  return result;
}

/** Poll for document updates using official CamInvoice polling endpoint */
export async function pollDocuments(params: PollDocumentsParams): Promise<PollDocumentsResponse> {
  const {
    accessToken,
    lastSyncedAt,
    baseUrl = CAMINVOICE_DEFAULT_BASE_URL,
  } = params;

  const url = new URL(`${baseUrl}/api/v1/document/poll`);
  if (lastSyncedAt) {
    url.searchParams.set('last_synced_at', lastSyncedAt);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    // Get error details from response
    let errorDetails = `HTTP ${res.status} ${res.statusText}`;
    try {
      const errorBody = await res.json();
      errorDetails += ` - ${JSON.stringify(errorBody)}`;
    } catch {
      // If we can't parse the error response, just use the status
    }

    console.error(`CamInvoice polling API error:`, errorDetails);
    throw new Error(`Failed to poll documents: ${errorDetails}`);
  }

  const result = await res.json();
  return {
    documents: result.documents || []
  };
}

export const CaminvoiceApi = {
  authTokenWithRefresh,
  submitInvoice,
  getInvoiceStatus,
  cancelInvoice,
  validateTaxpayer,
  getMemberDetailByEndpoint,
  probeToken,
  downloadDocumentPdf,
  sendDocuments,
  getDocumentDetail,
  pollDocuments,
};

