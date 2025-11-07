import { prisma } from '../src/lib/prisma'

/**
 * Backfill script: copy legacy `tin` column into `registration_number` on customers table.
 * - Safe to run multiple times (idempotent).
 * - Will no-op if legacy `tin` column does not exist.
 */
async function main() {
  console.log('Starting backfill: customers.tin -> customers.registration_number')

  // Check if legacy `tin` column exists
  const [{ exists }]: Array<{ exists: boolean }> = await prisma.$queryRawUnsafe(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'customers'
         AND column_name = 'tin'
     ) AS exists;`
  )

  if (!exists) {
    console.log('Legacy column "tin" not found on table "customers". Nothing to backfill.')
    return
  }

  // Perform backfill: copy tin into registration_number where missing
  const updatedCount: number = await prisma.$executeRawUnsafe(
    `UPDATE "customers"
       SET "registration_number" = "tin"
     WHERE "registration_number" IS NULL
       AND "tin" IS NOT NULL;`
  )

  console.log(`Backfill complete. Rows updated: ${updatedCount}`)
}

main()
  .catch((e) => {
    console.error('Backfill error:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

