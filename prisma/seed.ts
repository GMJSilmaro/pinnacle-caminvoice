import { PrismaClient } from '../src/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Hash passwords
  const hashedPassword = await bcrypt.hash('password123', 12)

  // Create Provider Configuration
  console.log('📋 Creating provider configuration...')
  const provider = await prisma.provider.upsert({
    where: { clientId: 'demo-provider-client-id' },
    update: {},
    create: {
      clientId: 'demo-provider-client-id',
      clientSecret: 'demo-provider-client-secret', // In production, this should be encrypted
      baseUrl: 'https://api.caminvoice.gov.kh',
      redirectUrls: ['http://localhost:3000/auth/callback'],
      isConfigured: false,
      isActive: true,
    },
  })

  // Create Sample Tenants
  console.log('🏢 Creating sample tenants...')
  const tenant1 = await prisma.tenant.upsert({
    where: { taxId: 'KHUJ000001234' },
    update: {},
    create: {
      name: 'ABC Corporation',
      businessName: 'ABC Corporation Ltd',
      taxId: 'KHUJ000001234',
      registrationNumber: 'REG123456789',
      email: 'admin@abccorp.com',
      phone: '+855 12 345 678',
      website: 'https://abccorp.com',
      address: '123 Business Street',
      city: 'Phnom Penh',
      postalCode: '12000',
      country: 'Cambodia',
      status: 'ACTIVE',
      isConnectedToCamInv: true,
      camInvoiceEndpointId: 'KHUID00001234',
      camInvoiceMocId: '1234567890',
    },
  })

  const tenant2 = await prisma.tenant.upsert({
    where: { taxId: 'KHUJ000005678' },
    update: {},
    create: {
      name: 'XYZ Trading',
      businessName: 'XYZ Trading Co Ltd',
      taxId: 'KHUJ000005678',
      registrationNumber: 'REG987654321',
      email: 'contact@xyztrading.com',
      phone: '+855 12 987 654',
      website: 'https://xyztrading.com',
      address: '456 Commerce Avenue',
      city: 'Siem Reap',
      postalCode: '17000',
      country: 'Cambodia',
      status: 'ACTIVE',
      isConnectedToCamInv: false,
    },
  })

  // Create Provider User
  console.log('👤 Creating provider user...')
  const providerUser = await prisma.user.upsert({
    where: { email: 'provider@pinnacle.com' },
    update: {},
    create: {
      email: 'provider@pinnacle.com',
      firstName: 'Service',
      lastName: 'Provider',
      password: hashedPassword,
      role: 'PROVIDER',
      status: 'ACTIVE',
      tenantId: null, // Provider users don't belong to a tenant
    },
  })

  // Create Tenant Admin Users
  console.log('👥 Creating tenant admin users...')
  const tenantAdmin1 = await prisma.user.upsert({
    where: { email: 'admin@abccorp.com' },
    update: {},
    create: {
      email: 'admin@abccorp.com',
      firstName: 'John',
      lastName: 'Smith',
      password: hashedPassword,
      role: 'TENANT_ADMIN',
      status: 'ACTIVE',
      tenantId: tenant1.id,
    },
  })

  const tenantAdmin2 = await prisma.user.upsert({
    where: { email: 'admin@xyztrading.com' },
    update: {},
    create: {
      email: 'admin@xyztrading.com',
      firstName: 'Jane',
      lastName: 'Doe',
      password: hashedPassword,
      role: 'TENANT_ADMIN',
      status: 'ACTIVE',
      tenantId: tenant2.id,
    },
  })

  // Create Tenant Users
  console.log('👨‍💼 Creating tenant users...')
  const tenantUser1 = await prisma.user.upsert({
    where: { email: 'accountant@abccorp.com' },
    update: {},
    create: {
      email: 'accountant@abccorp.com',
      firstName: 'Alice',
      lastName: 'Johnson',
      password: hashedPassword,
      role: 'TENANT_USER',
      status: 'ACTIVE',
      tenantId: tenant1.id,
    },
  })

  // Create Sample Customers
  console.log('🛒 Creating sample customers...')
  const customer1 = await prisma.customer.create({
    data: {
      tenantId: tenant1.id,
      name: 'Customer One Ltd',
      businessName: 'Customer One Limited',
      taxId: 'KHUJ000009999',
      email: 'billing@customerone.com',
      phone: '+855 12 111 222',
      address: '789 Customer Street',
      city: 'Phnom Penh',
      country: 'Cambodia',
      status: 'ACTIVE',
    },
  })

  const customer2 = await prisma.customer.create({
    data: {
      tenantId: tenant1.id,
      name: 'Customer Two Co',
      businessName: 'Customer Two Company',
      taxId: 'KHUJ000008888',
      email: 'accounts@customertwo.com',
      phone: '+855 12 333 444',
      address: '321 Client Avenue',
      city: 'Battambang',
      country: 'Cambodia',
      status: 'ACTIVE',
    },
  })

  console.log('✅ Database seeding completed successfully!')
  console.log('\n📊 Created:')
  console.log(`- 1 Provider configuration`)
  console.log(`- 2 Tenants (ABC Corporation, XYZ Trading)`)
  console.log(`- 4 Users (1 Provider, 2 Tenant Admins, 1 Tenant User)`)
  console.log(`- 2 Customers`)
  console.log('\n🔑 Login credentials:')
  console.log('Provider: provider@pinnacle.com / password123')
  console.log('Tenant Admin 1: admin@abccorp.com / password123')
  console.log('Tenant Admin 2: admin@xyztrading.com / password123')
  console.log('Tenant User: accountant@abccorp.com / password123')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
