/*
  Warnings:

  - The `camInvoiceStatus` column on the `credit_notes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `camInvoiceStatus` column on the `debit_notes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `camInvoiceStatus` column on the `invoices` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."CamInvoiceDocumentStatus" AS ENUM ('VALID', 'DELIVERED', 'ACKNOWLEDGED', 'IN_PROCESS', 'UNDER_QUERY', 'CONDITIONALLY_ACCEPTED', 'ACCEPTED', 'REJECTED', 'PAID');

-- AlterTable
ALTER TABLE "public"."credit_notes" ADD COLUMN     "camInvoiceStatusUpdatedAt" TIMESTAMP(3),
DROP COLUMN "camInvoiceStatus",
ADD COLUMN     "camInvoiceStatus" "public"."CamInvoiceDocumentStatus";

-- AlterTable
ALTER TABLE "public"."debit_notes" ADD COLUMN     "camInvoiceStatusUpdatedAt" TIMESTAMP(3),
DROP COLUMN "camInvoiceStatus",
ADD COLUMN     "camInvoiceStatus" "public"."CamInvoiceDocumentStatus";

-- AlterTable
ALTER TABLE "public"."invoices" ADD COLUMN     "camInvoiceStatusUpdatedAt" TIMESTAMP(3),
DROP COLUMN "camInvoiceStatus",
ADD COLUMN     "camInvoiceStatus" "public"."CamInvoiceDocumentStatus";
