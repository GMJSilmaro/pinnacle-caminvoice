// UBL-compliant invoice types for CamInv integration

export interface TaxScheme {
  id: 'VAT' | 'SP' | 'PLT' | 'AT'
  name: string
  description: string
}

export interface TaxCategory {
  id: 'S' | 'Z' // Standard or Zero
  percent: number
  taxScheme: TaxScheme
}

export interface TaxSubtotal {
  taxableAmount: number
  taxAmount: number
  taxCategory: TaxCategory
}

export interface TaxTotal {
  taxAmount: number
  taxSubtotals: TaxSubtotal[]
}

export interface PartyAddress {
  floor?: string
  room?: string
  streetName: string
  additionalStreetName?: string
  buildingName?: string
  cityName: string
  postalZone?: string
  countryIdentificationCode: string
}

export interface PartyTaxScheme {
  companyId: string
  taxScheme: TaxScheme
}

export interface PartyLegalEntity {
  registrationName: string
  companyId: string
}

export interface PartyContact {
  telephone?: string
  electronicMail?: string
}

export interface Party {
  endpointId: string
  partyName: string
  postalAddress: PartyAddress
  partyTaxScheme: PartyTaxScheme
  partyLegalEntity: PartyLegalEntity
  contact?: PartyContact
}

export interface AccountingParty {
  party: Party
}

export interface PaymentTerms {
  note: string
}

export interface AllowanceCharge {
  chargeIndicator: boolean // true for charge, false for allowance
  allowanceChargeReason: string
  amount: number
  taxCategory?: TaxCategory
}

export interface ExchangeRate {
  sourceCurrencyCode: string
  targetCurrencyCode: string
  calculationRate: number
}

export interface LegalMonetaryTotal {
  lineExtensionAmount: number
  taxExclusiveAmount: number
  taxInclusiveAmount: number
  allowanceTotalAmount?: number
  chargeTotalAmount?: number
  prepaidAmount?: number
  payableAmount: number
}

export interface Item {
  name: string
  description: string
  sellersItemIdentificationId?: string
  standardItemIdentificationId?: string
  originCountryIdentificationCode?: string
}

export interface Price {
  priceAmount: number
}

export interface InvoiceLineItem {
  id: string
  invoicedQuantity: number
  unitCode: string
  lineExtensionAmount: number
  allowanceCharges?: AllowanceCharge[]
  taxTotal: TaxTotal
  item: Item
  price: Price
}

export interface AdditionalDocumentReference {
  id: string
  documentDescription?: string
  attachment?: {
    embeddedDocumentBinaryObject?: string
    externalReferenceUri?: string
  }
}

export interface UBLInvoice {
  // Core mandatory fields
  id: string // Invoice number
  issueDate: string
  dueDate?: string
  invoiceTypeCode: string // Usually "388" for standard invoice
  documentCurrencyCode: string
  
  // Parties
  accountingSupplierParty: AccountingParty
  accountingCustomerParty: AccountingParty
  
  // Optional fields
  additionalDocumentReferences?: AdditionalDocumentReference[]
  paymentTerms?: PaymentTerms
  allowanceCharges?: AllowanceCharge[]
  taxExchangeRate?: ExchangeRate
  
  // Totals
  taxTotal: TaxTotal
  legalMonetaryTotal: LegalMonetaryTotal
  
  // Line items
  invoiceLines: InvoiceLineItem[]
  
  // Additional metadata (not part of UBL but needed for our system)
  notes?: string
  terms?: string
  status?: 'draft' | 'submitted' | 'delivered' | 'accepted' | 'rejected'
  camInvUuid?: string
  verificationLink?: string
}

// Form data structure for the UI
export interface InvoiceFormData {
  // Basic info
  invoiceNumber: string
  issueDate: string
  dueDate: string
  currency: string
  exchangeRate?: number
  
  // Customer selection
  customerId: string
  
  // Line items (simplified for form)
  lineItems: InvoiceLineFormItem[]
  
  // Document level allowances/charges
  allowanceCharges: AllowanceChargeFormItem[]
  
  // Payment terms
  paymentTermsNote: string
  
  // Additional notes
  notes: string
  terms: string
}

export interface InvoiceLineFormItem {
  id: string
  description: string
  name: string
  quantity: number
  unitCode: string
  unitPrice: number
  
  // Tax selections (checkboxes)
  taxes: {
    vat: { enabled: boolean; percent: number }
    sp: { enabled: boolean; percent: number }
    plt: { enabled: boolean; percent: number }
    at: { enabled: boolean; percent: number }
  }
  
  // Calculated fields
  lineExtensionAmount: number
  totalTaxAmount: number
}

export interface AllowanceChargeFormItem {
  id: string
  isCharge: boolean // true for charge, false for allowance
  reason: string
  amount: number
  taxable: boolean
  taxPercent?: number
}

// Available tax schemes in Cambodia
export const TAX_SCHEMES: Record<string, TaxScheme> = {
  VAT: { id: 'VAT', name: 'Value Added Tax', description: 'Standard VAT' },
  SP: { id: 'SP', name: 'Specific Tax', description: 'Specific Tax on certain goods' },
  PLT: { id: 'PLT', name: 'Public Lighting Tax', description: 'Public Lighting Tax' },
  AT: { id: 'AT', name: 'Accommodation Tax', description: 'Accommodation Tax' }
}

// Default tax percentages (can be customized)
export const DEFAULT_TAX_RATES = {
  VAT: 10,
  SP: 10,
  PLT: 5,
  AT: 2
}

// Invoice type codes
export const INVOICE_TYPE_CODES = {
  STANDARD: '388',
  CREDIT_NOTE: '381',
  DEBIT_NOTE: '383'
}

// Currency codes
export const CURRENCY_CODES = ['KHR', 'USD', 'EUR', 'THB']

// Unit codes for quantities
export const UNIT_CODES = [
  { value: 'none', label: 'None' },
  { value: 'piece', label: 'Piece' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'liter', label: 'Liter' },
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'meter', label: 'Meter' },
  { value: 'sqm', label: 'Square Meter' }
]
