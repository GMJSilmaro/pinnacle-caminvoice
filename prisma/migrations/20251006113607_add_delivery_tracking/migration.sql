-- CreateEnum
CREATE TYPE "public"."DeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "public"."DeliveryMethod" AS ENUM ('CAMINVOICE', 'EMAIL', 'MANUAL');

-- AlterTable
ALTER TABLE "public"."credit_notes" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveryError" TEXT,
ADD COLUMN     "deliveryMethod" "public"."DeliveryMethod",
ADD COLUMN     "deliveryStatus" "public"."DeliveryStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."debit_notes" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveryError" TEXT,
ADD COLUMN     "deliveryMethod" "public"."DeliveryMethod",
ADD COLUMN     "deliveryStatus" "public"."DeliveryStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."invoices" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveryError" TEXT,
ADD COLUMN     "deliveryMethod" "public"."DeliveryMethod",
ADD COLUMN     "deliveryStatus" "public"."DeliveryStatus" NOT NULL DEFAULT 'PENDING';
