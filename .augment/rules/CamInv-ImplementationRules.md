---
type: "agent_requested"
description: "Example description"
---

You are an engineering assistant. Implement a multi-tenant SaaS e-Invoice portal acting as a registered **Service Provider for CamInvoice (Cambodia e-Invoicing)**. Follow these hard rules **always**:

* Use **PNPM** only. Before running `pnpm dev` / `pnpm start` check the codebase and whether the app is already running (e.g., check port in use) — DO NOT run duplicate dev instances.
* **Always** read `docs/` and the RULES in the repo before changing anything.
* **Always** check the existing codebase & file structure; follow existing conventions. Do not introduce random files.
* **Separate** client components (`"use client"`) from server components consistently (Next.js App Router).
* Use stack: **Next.js (App Router)** + **BetterAuth** + **Mantine UI** + **MongoDB**.
* Secure sensitive data: env vars for provider secrets, encrypt merchant tokens at rest. No plaintext secrets in repo or logs.
* Keep changes small: one feature → one branch → one PR. Use branch names and commit message conventions from project RULES.

---

## High-level Phases (small PRs — run in sequence)

1. **Phase 0 — Repo hygiene & setup**

   * Tasks: pnpm install, lint, run tests (if exist), read `docs/`.
   * Branch: `feature/setup-caminv`
   * Acceptance: local dev runs, lint passes, README updated with any new env vars.

2. **Phase 1 — Provider Secret Storage & config**

   * Tasks:

     * Add env var names (see below).
     * Implement `ProviderSettings` model (encrypted fields) & admin UI to set provider client\_id/client\_secret.
   * Acceptance: secrets stored in DB encrypted; admin can update via secure server action.

3. **Phase 2 — Merchant OAuth / Connect flow**

   * Tasks:

     * Implement merchant connect page and OAuth handshake.
     * Exchange code for access + refresh tokens; store encrypted tokens linked to merchant.
   * Acceptance: merchant can connect; tokens stored encrypted; UI shows merchant registered status.

4. **Phase 3 — UBL XML generation + validation**

   * Tasks:

     * Implement `generateUblInvoice(invoice)` that returns valid UBL XML (skeleton).
     * Unit tests to validate required tags are present.
   * Acceptance: XML passes schema checks (unit test verifying required fields).

5. **Phase 4 — Submit invoice to CamInv**

   * Tasks:

     * Endpoint to submit XML using merchant or provider credentials as required.
     * Save response UUID and verification link.
   * Acceptance: invoice submission stores UUID + verification link and status `submitted`.

6. **Phase 5 — PDF generation + QR**

   * Tasks:

     * Generate PDF representation including verification QR (from verification link).
   * Acceptance: downloadable PDF contains QR that points to verification link.

7. **Phase 6 — Delivery to registered customers**

   * Tasks:

     * If customer has CamInv Endpoint ID, call delivery endpoint.
     * If not, fallback to email with PDF.
   * Acceptance: delivery call succeeds; UI shows delivery status.

8. **Phase 7 — Webhooks & Polling**

   * Tasks:

     * Implement `/api/caminv/webhook` (secure, verify signature).
     * Alternative: long polling job for endpoints where webhook not available.
   * Acceptance: webhook events stored, invoice statuses updated in DB.

9. **Phase 8 — Accept/Reject flows**

   * Tasks:

     * UI + server action to accept/reject incoming invoices/notes; call CamInv accept/reject endpoint.
   * Acceptance: remote status updates and local DB update are consistent.

10. **Phase 9 — Credit/Debit notes (mirror)**

    * Tasks: implement credit/debit XML, submission, delivery, webhook handling, PDF + QR.
    * Acceptance: same as invoices.

11. **Phase 10 — UI, Audit log, filtering & customer profile**

    * Tasks:

      * Mantine UI: invoices list, filters, merchant registration label, customer profiles with CamInv ID.
      * Audit logs collection and admin viewer.
    * Acceptance: filters work; audit log records operations.

12. **Phase 11 — Docs & tests**

    * Tasks: Add docs per feature in `docs/` and small unit/integration tests.
    * Acceptance: docs updated and linked from README; tests pass locally.

---

## Repo & Runtime Rules (for Cursor AI)

* Always create **one PR per phase**; PR title must start with the phase tag `feat(caminv):`.
* Include a small migration if adding DB fields.
* Add tests for core logic (XML, token encryption, webhook handler).
* Commit message examples:

  * `feat(caminv): add merchant oauth connect and token encryption`
  * `fix(caminv): validate ubl generation for tax fields`
* Branch name examples:

  * `feature/caminv-merchant-oauth`
  * `fix/caminv-webhook-verification`

---

## Important Env Vars (add to `.env.example`)

```
CAMINV_PROVIDER_CLIENT_ID=
CAMINV_PROVIDER_CLIENT_SECRET=
CAMINV_BASE_URL=https://api.caminv.example    # provider API base
CAMINV_WEBHOOK_SECRET=                          # for webhook signature verification
TOKEN_ENCRYPTION_KEY=                           # server-side secret to encrypt tokens (rotateable)
MONGODB_URI=
NEXTAUTH_SECRET=                                # BetterAuth / session secret
```

---

## Minimal DB Schemas (important fields only — Mongoose style)

```js
// Merchant
const MerchantSchema = new Schema({
  name: String,
  tenantId: String,         // multi-tenant key
  camInv: {
    connected: { type: Boolean, default: false },
    endpointId: String,     // merchant’s CamInv Endpoint ID (if any)
    tokens: {               // encrypted JSON blob: { accessToken, refreshToken, expiresAt }
      type: String
    },
    lastConnectedAt: Date
  }
});

// Invoice
const InvoiceSchema = new Schema({
  tenantId: String,
  invoiceNo: String,
  status: String,          // draft | submitted | delivered | accepted | rejected
  uuid: String,            // CamInv UUID after submission
  verificationLink: String,
  xml: String,             // raw UBL XML
  pdfPath: String,
  createdBy: String,
  createdAt: Date
});

// Audit Log
const AuditLogSchema = new Schema({
  tenantId: String,
  userId: String,
  action: String,
  resource: String,
  resourceId: String,
  payload: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});
```

**Encrypt / Decrypt helper (important snippets only):**

```js
import crypto from 'crypto';
const ALGO = 'aes-256-gcm';
const KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'hex');

export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  let enc = cipher.update(text, 'utf8', 'base64');
  enc += cipher.final('base64');
  const tag = cipher.getAuthTag().toString('base64');
  return `${iv.toString('base64')}.${tag}.${enc}`;
}

export function decrypt(token) {
  const [iv64, tag64, enc] = token.split('.');
  const iv = Buffer.from(iv64, 'base64');
  const tag = Buffer.from(tag64, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  let out = decipher.update(enc, 'base64', 'utf8');
  out += decipher.final('utf8');
  return out;
}
```

---

## OAuth connect — server action skeleton (important lines only)

```js
// /app/(merchant)/connect/page.tsx -> calls server action connectMerchant(code)
export async function connectMerchant(code, tenantId, userId) {
  // exchange code at CAMINV token endpoint
  const res = await fetch(`${process.env.CAMINV_BASE_URL}/oauth/token`, {
    method: 'POST',
    body: new URLSearchParams({ code, client_id: process.env.CAMINV_PROVIDER_CLIENT_ID, client_secret: process.env.CAMINV_PROVIDER_CLIENT_SECRET, grant_type: 'authorization_code', redirect_uri: ... })
  });
  const tokens = await res.json(); // access_token, refresh_token, expires_in
  // store encrypted
  const encrypted = encrypt(JSON.stringify(tokens));
  await MerchantModel.updateOne({ tenantId }, { $set: { 'camInv.connected': true, 'camInv.tokens': encrypted, 'camInv.lastConnectedAt': new Date() }});
  // return success
}
```

---

## UBL XML generation — skeleton (important outline only)

```js
import { create } from 'xmlbuilder2';

export function generateUblInvoice(invoice) {
  const xmlObj = {
    'Invoice': {
      '@xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      'cbc:ID': invoice.invoiceNo,
      'cbc:IssueDate': invoice.issueDate,
      'cac:AccountingSupplierParty': { /* supplier details */ },
      'cac:AccountingCustomerParty': { /* customer details */ },
      'cac:TaxTotal': { /* tax breakdown */ },
      'cac:LegalMonetaryTotal': { /* totals */ },
      'cac:InvoiceLine': invoice.lines.map((ln, i) => ({ 'cbc:ID': i+1, /* item, price, tax */ }))
    }
  };
  const doc = create(xmlObj);
  return doc.end({ prettyPrint: false });
}
```

**Unit test**: ensure required tags (`cbc:ID`, `cbc:IssueDate`, tax totals) exist.

---

## Submit to CamInv (important parts)

```js
async function submitInvoice(tenantId, invoiceXml) {
  const merchant = await MerchantModel.findOne({ tenantId });
  const tokens = JSON.parse(decrypt(merchant.camInv.tokens));
  const res = await fetch(`${process.env.CAMINV_BASE_URL}/invoices`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokens.access_token}`, 'Content-Type': 'application/xml' },
    body: invoiceXml
  });
  const data = await res.json();
  // save uuid and verification link
  await InvoiceModel.updateOne({ invoiceNo: ... }, { $set: { uuid: data.uuid, verificationLink: data.verificationUrl, status: 'submitted', xml: invoiceXml }});
}
```

---

## Webhook handler (important pieces)

```js
// /app/api/caminv/webhook/route.ts (server route)
export async function POST(req) {
  const raw = await req.text();
  const signature = req.headers.get('x-caminv-signature');
  if (!verifySignature(raw, signature, process.env.CAMINV_WEBHOOK_SECRET)) return new Response('invalid', { status: 401 });
  const payload = JSON.parse(raw);
  // store raw event
  await WebhookEventModel.create({ tenantId: payload.tenantId, payload });
  // update invoice status
  await InvoiceModel.updateOne({ uuid: payload.uuid }, { $set: { status: payload.status }});
  return new Response('ok', { status: 200 });
}
```

**verifySignature**: use HMAC with webhook secret — important to avoid replay attacks; store raw event for audit.

---

## PDF + QR generation (important idea)

* Use `qrcode` to create a data URL: `const qr = await QRCode.toDataURL(verificationLink)`.
* Use `puppeteer` or `pdf-lib` to render an HTML invoice (Mantine printable view) to PDF and embed the QR image.
* Save PDF to object storage (S3 / Minio) or local file path and store `pdfPath` on invoice record.

---

## Audit & filtering (important policies)

* Log every action that touches CamInv: submissions, webhook events, accept/reject calls, token refreshes.
* Add DB index on `{ tenantId, status }` for quick filtering.
* UI: Mantine Table with filter controls — status chips and date range.

---

## Credit/Debit notes

* Implement `generateUblCreditNote(note)` mirroring invoice generation.
* Submission/delivery/webhook handlers mirror invoice flow.
* Same acceptance / PDF + QR storage.

---

## UI: Merchant status & invoice list (important UI contract)

* Merchant profile page must show: `CamInv: Connected` (green) or `Not connected` (red) with endpointId.
* Invoice list has columns: Invoice No, UUID, Status (badge), Verification QR icon (download), Actions (resend, view XML, view PDF).
* Filtering UI: status dropdown + search by invoice no.

---

## Tests & Docs (acceptance)

* Unit tests for: XML generator output contains required tags, encrypt/decrypt roundtrip, webhook verification.
* Integration test: merchant OAuth flow mock (stub token endpoint), submit invoice stub CamInv endpoint.
* Update `docs/caminv/` per phase: OAuth, XML spec, webhook payload examples, endpoints.

---

## Deliverables per PR

* Code changes (server actions, models, routes, UI small components).
* Migration script (if DB fields added).
* Unit tests covering new logic.
* `docs/` entry referencing new feature and how to test locally.
* Short PR description and acceptance checklist.

---
346347348344345341342343339340336337338334335331332333349350351352353354355$0
## Final instructions for Cursor AI execution style

* Work **phase by phase**. Stop after implementing a phase and produce:

  1. Branch name and PR title.
  2. Files added/changed (paths).
  3. Short code snippets (key parts).
  4. Tests added and how to run them.
  5. Docs updated (path).
  6. Manual QA checklist (what to test locally).
* Keep PRs small and non-breaking. Do not change unrelated files.
* **Always** check `docs/` and code structure before proposing file paths.

---