---
type: "always_apply"
---

## 🚨 STRICT DEVELOPMENT RULES (GLOBAL)

### 1. Package Manager

* **MANDATORY**: Use **PNPM** only.
* **FORBIDDEN**: Never use `npm` or `yarn`.
* Before running `pnpm dev` or `pnpm start`, **check if a process is already running**. Never start multiple servers.


### 2. Codebase Discipline

* **ALWAYS** read the existing codebase before writing new code.
* **NEVER** introduce random files, folders, or code that is not aligned with the current structure.
* **MANDATORY**: Follow `/src/app` structure for Next.js App Router.
* **MANDATORY**: Place shared code only in `/components`.

---

### 3. Client vs Server Components

* **DEFAULT**: All `page.tsx` and `layout.tsx` files are **Server Components**.
* **ONLY** add `"use client"` when strictly required (`useState`, `useEffect`, `mutations` event handlers).
* **MANDATORY NAMING**: If a component is client-only, append `.client.tsx` (example: `StatsCard.client.tsx`).
* **FORBIDDEN**: Do not mix client and server logic in one file.

---

### 4. Documentation

* **ALWAYS** check `/docs` folder before suggesting or writing new code.
* **FORBIDDEN**: Making assumptions without confirming requirements.
* If unclear, **ASK** before coding.

---

### 5. Tech Stack (Non-Negotiable)

* Framework: **Next.js App Router** (latest).
* Auth: **BetterAuth**.
* UI Library: **Mantine UI**.
* Database: **PostGresSQL/Prisma**.
* State: Use `store/` (Zustand/Redux).

---

### 6. Roles & Routing

* **Provider Role** → `/provider/*` (Service Provider Admins only).
* **Tenant Admin/User Roles** → `/portal/*` (tenant admins + tenant users).
* **Auth** → `/auth/*`.
* **FORBIDDEN**: Do not use `/admin`. Providers only use `/provider`.

---

### 7. Workflow Enforcement

* **MANDATORY**: Work step by step → Design → Data → Integration.
* **FORBIDDEN**: Writing half-implemented features or skipping design.
* **MANDATORY**: Avoid duplicate or conflicting code.

---

### 8. Invoice System Rules

* **MANDATORY**:

  * Create Invoice UI + Edit Invoice UI.
  * Use Mantine `<Timeline />` for submission tracker.
  * Generate UBL XML correctly.
  * PDF must include QR verification.
  * Support Credit/Debit notes with the same workflow.
* **FORBIDDEN**: Skipping invoice tracking, QR, or status updates.

---

### 9. Provider Monitoring

* **MANDATORY**:

  * Providers must have a monitoring dashboard in `/provider`.
  * Show tenants, activity logs, and invoice statuses.
* **FORBIDDEN**: Giving tenant users access to provider-only features.

---

✅ These are **strict, non-negotiable rules**.
Agent AI (and devs) **must follow exactly** — no shortcuts, no assumptions.
---