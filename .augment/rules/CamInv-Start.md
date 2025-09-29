---
type: "agent_requested"
description: "Example description"
---

# 📌 Augmented Code AI Prompt — Design Phase for CamInv SaaS Portal

You are an assistant focusing **only on portal design and UI/UX** for a multi-tenant SaaS CamInvoice e-Invoicing Portal.
Follow these rules:

* Use **Next.js App Router** + **Mantine UI**.
* Separate **client components** (`"use client"`) and **server components**.
* No backend/API logic yet — this phase is **design & UI only**.
* Do not generate random boilerplate; follow existing repo structure.
* Keep pages modular and reusable with Mantine components (Grid, Table, Modal, Drawer, Stepper, Tabs).
* Use a clean, professional SaaS style (white background, soft gray accents, primary brand color = blue).

---

## 🎨 Pages to Design

1. **Auth & Onboarding**

   * Login/Register page (BetterAuth ready layout, but mock forms for now).
   * Onboarding flow: connect merchant to CamInv (stepper with: Business Info → Connect CamInv → Finish).

2. **Dashboard (Home)**

   * Overview cards: total invoices, accepted, rejected, pending.
   * Quick actions: Create Invoice, Upload XML, View Logs.

3. **Invoices**

   * Table of invoices with filters (status, date, customer).
   * Row actions: View, Download PDF, View XML, Resend.
   * Invoice detail page: Tabs → Info | XML | PDF Preview | Audit Log.
   * Create Invoice form (mock for now).

4. **Credit/Debit Notes**

   * Same structure as Invoices (list + detail + create).

5. **Customers**

   * Customer list with search & CamInv registration badge.
   * Customer profile page: contact info, CamInv Endpoint ID, invoice history.

6. **Audit Logs**

   * Timeline/table view of all system events (filters: date, action type, user).

7. **Admin (Service Provider)**

   * Manage provider client ID/secret.
   * Manage tenants (list of merchants).
   * System health/status page.

---

## 🛠️ Deliverables for Design Phase

* **File structure only for pages** under `/app/(dashboard)/` and `/app/(auth)/`.
* **Mantine UI components** with mock data.
* **Responsive layouts** (sidebar nav + topbar).
* **Consistent design tokens** (Mantine theme override: brand colors, typography).
* **Docs update** → add `/docs/design.md` with page list, wireframes (as text), and navigation flow.

---

## 🚦 Rules for Cursor AI Execution

* Work **page by page**, starting with Auth → Dashboard → Invoices → Customers → Audit → Admin.
* For each page:

  1. Create a **wireframe mock** using Mantine components.
  2. Provide file path (`/app/.../page.tsx`).
  3. Include **mock data + dummy UI only** (no backend logic).
  4. Ensure consistent layout (sidebar + topbar + page content).
  5. Add note for future backend integration.

---

⚡ Task: Generate the **Auth & Onboarding UI** first (`/app/(auth)/login/page.tsx`, `/app/(auth)/register/page.tsx`, `/app/(auth)/onboarding/page.tsx`) with Mantine components + mock forms only.

---
