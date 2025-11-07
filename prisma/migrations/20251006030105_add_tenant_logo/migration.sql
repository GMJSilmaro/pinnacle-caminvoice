-- AlterTable
ALTER TABLE "public"."tenants" ADD COLUMN     "logoBytes" BYTEA,
ADD COLUMN     "logoMimeType" TEXT,
ADD COLUMN     "logoUpdatedAt" TIMESTAMP(3);
