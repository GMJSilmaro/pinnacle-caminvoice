---
type: "agent_requested"
description: "Example description"
---

### 📌 Core Collections

#### 1. **Providers**

(Your SaaS entity, usually just 1, but flexible if you scale to multiple service providers in future.)

```ts
Provider {
  _id: ObjectId,
  name: String,
  email: String,
  apiKeys: {
    clientId: String,
    clientSecret: String,
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

#### 2. **Tenants**

(Each company/client that signs up with you)

```ts
Tenant {
  _id: ObjectId,
  providerId: ObjectId, // Reference to Provider
  name: String,
  domain: String, // optional, if you allow custom domains
  country: String, // useful for eInvoice API rules
  status: { type: String, enum: ["active", "suspended"] },
  createdAt: Date,
  updatedAt: Date,
  
  settings: {
    einvoiceApi: {
      clientId: String,
      clientSecret: String,
    },
    dbUri: String, // if you separate per-tenant db
  }
}
```

---

#### 3. **Users**

(Users belong to tenants, roles are tenant-specific)

```ts
User {
  _id: ObjectId,
  tenantId: ObjectId, // Reference to Tenant
  email: String,
  passwordHash: String,
  role: { type: String, enum: ["tenant_admin", "tenant_user"] },
  name: String,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date,
  
  activityLogs: [
    {
      action: String,
      timestamp: Date,
      metadata: Object
    }
  ]
}
```

---

#### 4. **ProviderUsers** (Optional)

(If you want your internal provider admins separate from tenant users)

```ts
ProviderUser {
  _id: ObjectId,
  providerId: ObjectId,
  email: String,
  passwordHash: String,
  role: { type: String, enum: ["super_admin", "support"] },
  createdAt: Date,
  updatedAt: Date
}
```

---

#### 5. **Invoices** (Tenant Data)

(Sits under each tenant, but can also be centralized with `tenantId` field)

```ts
Invoice {
  _id: ObjectId,
  tenantId: ObjectId,
  customerId: ObjectId, // Ref to customer
  xmlData: String, // UBL XML
  pdfUrl: String,
  status: { type: String, enum: ["draft", "submitted", "accepted", "rejected"] },
  verification: {
    uuid: String,
    link: String,
    qrCode: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

#### 6. **Customers**

(Merchants’ customers)

```ts
Customer {
  _id: ObjectId,
  tenantId: ObjectId,
  name: String,
  camInvId: String, // CamInv endpoint ID if available
  email: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

### 🔑 Key Notes for Multi-tenancy

* **Provider-level isolation:**
  Providers see all tenants and their data.

* **Tenant-level isolation:**
  Users can **only see their tenant’s data**. Use `tenantId` filtering at query level.

* **Tenant Admins:**

  * Manage users under their tenant.
  * See activity logs (from `User.activityLogs`).

* **Tenant Users:**

  * Limited access (e.g., submit invoices, view own actions).

* **Activity Logs:**
  You can either store them inside `User` (as above) or in a separate `AuditLog` collection if you expect large volumes:

  ```ts
  AuditLog {
    _id: ObjectId,
    tenantId: ObjectId,
    userId: ObjectId,
    action: String,
    details: Object,
    createdAt: Date
  }
  ```

---
