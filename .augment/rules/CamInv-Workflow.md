---
type: "agent_requested"
description: "Example description"
---

# 📌 Augmented Code AI Implementation Prompt (CamInvoice SaaS Provider)

You are helping me implement a **multi-tenant SaaS e-Invoice Portal** where we are a **registered Service Provider for CamInvoice (Cambodia E-Invoicing)**.

Follow these strict rules:

* Use **PNPM** as package manager.
* Stack: **Next.js App Router + MongoDB + BetterAuth + Mantine UI**.
* Organize codebase: **separate client and server components**, use clean modules.
* Securely handle sensitive data (no plain text secrets in repo).
* Always reference `docs/` if unclear.
* No random or overcomplicated code.

---

## ✅ Implementation Functions Needed

Implement the following **core functions step by step**:

Important Note: Step 1 to Step 3 should be 1 time setup only as per advice by Cambodia Government and only us Providers are able to setup this but it can be used globally by all our end users

1. **Secure Storage** → Store provider info (client ID & secret) securely (env vars, encrypted DB fields).
2. **Merchant Account Linking** → Allow merchants to connect their account with CamInv via OAuth2.
3. **Merchant Tokens Storage** → Securely store merchant access/refresh tokens.
4. **UBL XML Generation** → Generate correct UBL XML for e-invoices (tax compliant).
5. **Invoice Submission** → Submit invoices to CamInv for validation.
6. **Invoice Delivery** → Send invoices to customers who are also registered with CamInv.
7. **Invoice Reception** → Receive invoices via webhook or polling.
8. **Invoice Accept/Reject** → Allow merchants to accept/reject received invoices.
9. **Status Updates** → Listen for CamInv status updates via webhook or long polling and update DB.
10. **Invoice Storage** → Store sent/received XML, UUID, and verification link.
11. **PDF with QR** → Generate invoice PDFs with CamInv verification QR code.
12. **Credit/Debit Notes** → Support UBL XML generation, submission, delivery, reception, accept/reject, and storage of Credit/Debit notes (same as invoices).
13. **Merchant Registration Label** → Show status if merchant is registered with CamInv.
14. **Invoice Status UI** → Display current status of sent invoices.
15. **Audit Log** → Maintain logs of all CamInv operations (who, what, when).
16. **Status Filtering** → Filter invoices based on statuses in dashboard.
17. **Customer Profile Management** → Allow merchants to check if a customer is CamInv-registered (via Endpoint ID).

---

## 📂 Expected Implementation Output

* Modularized **server actions** (Next.js App Router).
* **PostgresSQL/Prisma schema design** for merchants, invoices, logs, tokens.
* **Mantine UI** dashboard pages for invoices, customer profiles, and logs.
* **Table Library** Always use a reusable tanstack/react-table: TanStack Table To avoid inconsistent design use it with PostgresSQL/Prisma + SWR and for client side fetching + mutations. It was a good solution for being able to delete/update entries and have them instantly reflected in the dashboard without refreshing.
* **API routes** for webhooks/polling.
* **Utils/helpers** for UBL XML + QR code generation.
* **Docs update** on each feature implemented.

---

⚡ **Task:** Generate code and structure to implement these requirements step by step. Always explain **why** you choose a design pattern before showing code.

---