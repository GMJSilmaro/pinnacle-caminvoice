# CamInvoice SaaS Portal - Design Documentation

## Overview
Multi-tenant SaaS e-Invoicing Portal for CamInvoice (Cambodia e-Invoicing) integration.

**Tech Stack:**
- Next.js 15 (App Router)
- Mantine UI v8.3.1
- TypeScript
- Professional SaaS Design (Blue primary, white background, soft gray accents)

## Page Structure & Routes

### Authentication Routes (`/app/(auth)/`)
- `/login` - Login page with BetterAuth ready layout
- `/register` - Registration page
- `/onboarding` - Multi-step onboarding flow

### Dashboard Routes (`/app/(dashboard)/`)
- `/` - Dashboard home with overview cards
- `/invoices` - Invoice management with filtering and search
- `/invoices/[id]` - Invoice detail page with Timeline tracker
- `/invoices/create` - Create new invoice with comprehensive form
- `/credit-notes` - Credit/Debit notes management
- `/credit-notes/[id]` - Credit/Debit note detail
- `/credit-notes/create` - Create new credit/debit note
- `/customers` - Customer management
- `/customers/[id]` - Customer profile
- `/users` - User management for tenant employees
- `/audit-logs` - System audit logs
- `/provider` - Service provider admin panel (role-restricted)

## Wireframes (Text Description)

### 1. Authentication Layout
```
┌─────────────────────────────────────┐
│  [Logo]     CamInvoice Portal       │
├─────────────────────────────────────┤
│                                     │
│    ┌─────────────────────────┐      │
│    │                         │      │
│    │    Login/Register       │      │
│    │    Form Container       │      │
│    │                         │      │
│    └─────────────────────────┘      │
│                                     │
└─────────────────────────────────────┘
```

### 2. Dashboard Layout
```
┌─────────────────────────────────────────────────────────┐
│  Header: Logo | Search | Notifications | Profile        │
├─────────────┬───────────────────────────────────────────┤
│             │  Dashboard Content Area                   │
│  Sidebar    │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │
│  Navigation │  │Card │ │Card │ │Card │ │Card │        │
│             │  └─────┘ └─────┘ └─────┘ └─────┘        │
│  - Dashboard│                                          │
│  - Invoices │  Quick Actions:                          │
│  - Credit   │  [Create Invoice] [Upload XML] [Logs]    │
│  - Customers│                                          │
│  - Audit    │  Recent Activity Table                   │
│  - Admin    │  ┌─────────────────────────────────────┐ │
│             │  │ Invoice # | Status | Date | Actions │ │
│             │  └─────────────────────────────────────┘ │
└─────────────┴───────────────────────────────────────────┘
```

### 3. Invoice List Page
```
┌─────────────────────────────────────────────────────────┐
│  Invoices                                    [+ Create] │
├─────────────────────────────────────────────────────────┤
│  Filters: [Status ▼] [Date Range] [Customer] [Search]   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐ │
│  │ # | Invoice No | Customer | Status | Date | Actions │ │
│  │ 1 | INV-001    | ABC Corp | Sent   | Today| [⋯]     │ │
│  │ 2 | INV-002    | XYZ Ltd  | Draft  | Today| [⋯]     │ │
│  └─────────────────────────────────────────────────────┘ │
│  Pagination: [← 1 2 3 →]                               │
└─────────────────────────────────────────────────────────┘
```

### 4. Invoice Detail Page
```
┌─────────────────────────────────────────────────────────┐
│  ← Back to Invoices    Invoice INV-001                  │
├─────────────────────────────────────────────────────────┤
│  [Info] [XML] [PDF Preview] [Audit Log]                │
├─────────────────────────────────────────────────────────┤
│  Invoice Information:                                   │
│  Customer: ABC Corp                                     │
│  Amount: $1,000.00                                      │
│  Status: [Sent] 🟢                                      │
│  CamInv UUID: cam-uuid-123                             │
│  Verification: [QR Code] [Link]                        │
│                                                         │
│  Actions: [Download PDF] [View XML] [Resend]           │
└─────────────────────────────────────────────────────────┘
```

### 5. Onboarding Flow
```
┌─────────────────────────────────────────────────────────┐
│  Welcome to CamInvoice Portal                           │
├─────────────────────────────────────────────────────────┤
│  Step 1 of 3: Business Information                     │
│  ●─────○─────○                                         │
│                                                         │
│  Business Name: [________________]                      │
│  Tax ID: [________________]                             │
│  Address: [________________]                            │
│  Contact: [________________]                            │
│                                                         │
│  [Back]                              [Continue →]      │
└─────────────────────────────────────────────────────────┘
```

## Navigation Flow

1. **Authentication Flow:**
   - Landing → Login/Register → Onboarding → Dashboard

2. **Main Navigation:**
   - Dashboard (Overview)
   - Invoices (List → Detail/Create)
   - Credit/Debit Notes (List → Detail/Create)
   - Customers (List → Profile)
   - Audit Logs (Timeline view)
   - Admin (Service Provider settings)

3. **Invoice Workflow:**
   - Create → Submit to CamInv → Generate PDF → Deliver → Track Status

## Design Tokens

### Colors
- **Primary:** Blue (#1976d2)
- **Background:** White (#ffffff)
- **Surface:** Light Gray (#f8f9fa)
- **Text:** Dark Gray (#212529)
- **Success:** Green (#28a745)
- **Warning:** Orange (#ffc107)
- **Error:** Red (#dc3545)

### Typography
- **Font Family:** Inter, system-ui, sans-serif
- **Headings:** Bold, larger sizes
- **Body:** Regular weight, readable sizes

### Components
- **Cards:** White background, subtle shadow
- **Tables:** Striped rows, hover effects
- **Buttons:** Rounded corners, consistent sizing
- **Forms:** Clear labels, validation states
- **Status Badges:** Color-coded, rounded

## Responsive Design
- **Desktop:** Full sidebar navigation
- **Tablet:** Collapsible sidebar
- **Mobile:** Bottom navigation or hamburger menu

## Mock Data Requirements
- Sample invoices with various statuses
- Customer data with CamInv registration status
- Audit log entries
- Dashboard statistics
- Onboarding form validation

## New Features Implemented

### 1. Create Invoice UI (`/invoices/create`)
- Comprehensive form with customer selection
- Dynamic line items with product/service selection
- Real-time tax and total calculations
- Mock data for customers and products
- Validation and submission workflow
- CamInvoice integration preparation

### 2. Edit Invoice UI with Timeline (`/invoices/[id]`)
- Tabbed interface: Overview, Timeline, XML, PDF Preview
- **Mantine Timeline component** for submission tracking
- Real-time status updates and processing stages
- CamInvoice UUID and verification links
- Edit modal with validation
- Action buttons for resend, accept/reject

### 3. Provider Tenant Management (`/provider`)
- **Role-based access control** (provider role only)
- Comprehensive tenant dashboard with statistics
- Tenant table with search and filtering
- Connection status monitoring
- Detailed tenant modals with tabs
- Add/edit tenant functionality
- CamInvoice connection status tracking

### 4. User Management System (`/users`)
- Employee account management for tenants
- Role-based permissions (admin, accountant, clerk, viewer)
- Department organization
- User status management (active/inactive)
- Permission granularity
- Add/edit user modals with validation

### 5. Navigation Updates
- Added User Management link
- Changed Admin to Provider Admin (role-restricted)
- Role-based navigation filtering
- Updated icons and organization

## Role-Based Access Control

### User Roles
- **Provider**: Service provider personnel (access to `/provider`)
- **Tenant Admin**: Tenant administrators (full tenant access)
- **Tenant User**: Regular tenant employees (limited access)

### Permission System
- `create_invoice` - Create new invoices
- `edit_invoice` - Edit existing invoices
- `delete_invoice` - Delete invoices
- `manage_customers` - Customer management
- `view_reports` - Access to reports
- `manage_users` - User management
- `system_settings` - System configuration

## 🎨 Layout System Enhancement

### Centralized Page Layout
The portal now uses a centralized layout system for consistency and maintainability:

**Key Components:**
- **`PageLayout`** - Main wrapper component for all pages
- **`PageHeader`** - Enhanced sticky header with scroll detection
- **Fixed Footer** - Footer positioned at bottom, doesn't scroll with content

### Usage Pattern
```tsx
// Centralized approach - no need to edit individual pages
<PageLayout
  title="Page Title"
  subtitle="Optional description"
  badge={{ text: "Status", color: "blue" }}
  actions={<Button>Action Button</Button>}
  showBackButton={true}
>
  {/* Page content automatically gets proper spacing */}
</PageLayout>
```

### Key Features
- ✅ **Sticky Headers** - Headers stick below main navigation when scrolling
- ✅ **Scroll Effects** - Dynamic blur and shadow effects on scroll
- ✅ **Fixed Footer** - Footer stays at bottom like sidebar
- ✅ **Responsive Design** - Works on all screen sizes
- ✅ **Consistent Spacing** - Automatic padding and margins
- ✅ **No Individual Edits** - Changes apply to all pages automatically

### Technical Implementation
- **Sticky positioning** accounts for main header height (60px)
- **Backdrop blur** with fallback for older browsers
- **CSS transitions** for smooth scroll effects
- **Z-index management** to prevent conflicts
- **Mobile responsive** with adjusted spacing

## Future Backend Integration Notes
- BetterAuth integration points marked
- API endpoint placeholders
- Database schema considerations
- CamInv API integration points
- File upload handling areas
- Role-based middleware implementation
- Permission checking system
