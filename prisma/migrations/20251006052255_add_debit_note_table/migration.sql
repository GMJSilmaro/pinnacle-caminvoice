-- CreateTable
CREATE TABLE "public"."debit_notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "originalInvoiceId" TEXT,
    "debitNoteNumber" TEXT NOT NULL,
    "type" "public"."InvoiceType" NOT NULL DEFAULT 'DEBIT_NOTE',
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "camInvoiceUuid" TEXT,
    "camInvoiceStatus" TEXT,
    "xmlContent" TEXT,
    "pdfUrl" TEXT,
    "qrCode" TEXT,
    "verificationUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "debit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "debit_notes_camInvoiceUuid_key" ON "public"."debit_notes"("camInvoiceUuid");

-- CreateIndex
CREATE UNIQUE INDEX "debit_notes_tenantId_debitNoteNumber_key" ON "public"."debit_notes"("tenantId", "debitNoteNumber");

-- AddForeignKey
ALTER TABLE "public"."debit_notes" ADD CONSTRAINT "debit_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."debit_notes" ADD CONSTRAINT "debit_notes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
