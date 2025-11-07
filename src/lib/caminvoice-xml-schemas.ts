// Zod schemas for CamInvoice XML builder inputs

import { z } from 'zod'

// Core tax schemas
export const TaxSchemeSchema = z.object({
  id: z.enum(['VAT','SP','PLT','AT']),
  name: z.string().min(1),
  description: z.string().optional().default(''),
})

export const TaxCategorySchema = z.object({
  id: z.enum(['S','Z']),
  percent: z.number().min(0),
  taxScheme: TaxSchemeSchema,
})

export const TaxSubtotalSchema = z.object({
  taxableAmount: z.number().min(0),
  taxAmount: z.number().min(0),
  taxCategory: TaxCategorySchema,
})

export const TaxTotalSchema = z.object({
  taxAmount: z.number().min(0),
  taxSubtotals: z.array(TaxSubtotalSchema).default([]),
})

// Parties
export const PartyAddressSchema = z.object({
  floor: z.string().optional(),
  room: z.string().optional(),
  streetName: z.string().min(1),
  additionalStreetName: z.string().optional(),
  buildingName: z.string().optional(),
  cityName: z.string().min(1),
  postalZone: z.string().optional(),
  countryIdentificationCode: z.string().min(2).max(3),
})

export const PartyTaxSchemeSchema = z.object({
  companyId: z.string().min(1), // TIN or equivalent
  taxScheme: TaxSchemeSchema,
})

export const PartyLegalEntitySchema = z.object({
  registrationName: z.string().min(1),
  companyId: z.string().min(1),
})

export const PartyContactSchema = z.object({
  telephone: z.string().optional(),
  electronicMail: z.string().email().optional(),
})

export const PartySchema = z.object({
  endpointId: z.string().min(1),
  partyName: z.string().min(1),
  postalAddress: PartyAddressSchema,
  partyTaxScheme: PartyTaxSchemeSchema,
  partyLegalEntity: PartyLegalEntitySchema,
  contact: PartyContactSchema.optional(),
})

export const AccountingPartySchema = z.object({
  party: PartySchema,
})

// Line items
export const ItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  sellersItemIdentificationId: z.string().optional(),
  standardItemIdentificationId: z.string().optional(),
  originCountryIdentificationCode: z.string().optional(),
})

export const PriceSchema = z.object({
  priceAmount: z.number().min(0),
})

export const InvoiceLineItemSchema = z.object({
  id: z.string().min(1),
  invoicedQuantity: z.number().min(0.000001),
  unitCode: z.string().min(1),
  lineExtensionAmount: z.number().min(0),
  taxTotal: TaxTotalSchema,
  item: ItemSchema,
  price: PriceSchema,
})

export const AdditionalDocumentReferenceSchema = z.object({
  id: z.string().min(1),
  documentDescription: z.string().optional(),
  attachment: z
    .object({
      embeddedDocumentBinaryObject: z.string().optional(),
      externalReferenceUri: z.string().url().optional(),
    })
    .optional(),
})

export const LegalMonetaryTotalSchema = z.object({
  lineExtensionAmount: z.number().min(0),
  taxExclusiveAmount: z.number().min(0),
  taxInclusiveAmount: z.number().min(0),
  allowanceTotalAmount: z.number().min(0).optional(),
  chargeTotalAmount: z.number().min(0).optional(),
  prepaidAmount: z.number().min(0).optional(),
  payableAmount: z.number().min(0),
})

// Invoice (380/388)
export const UBLInvoiceSchema = z.object({
  id: z.string().min(1),
  issueDate: z.string().min(1),
  dueDate: z.string().optional(),
  invoiceTypeCode: z.enum(['380','388']),
  documentCurrencyCode: z.string().min(1),
  accountingSupplierParty: AccountingPartySchema,
  accountingCustomerParty: AccountingPartySchema,
  additionalDocumentReferences: z.array(AdditionalDocumentReferenceSchema).optional(),
  paymentTerms: z.object({ note: z.string() }).optional(),
  allowanceCharges: z.any().optional(),
  taxExchangeRate: z
    .object({
      sourceCurrencyCode: z.string(),
      targetCurrencyCode: z.string(),
      calculationRate: z.number().min(0),
    })
    .optional(),
  taxTotal: TaxTotalSchema,
  legalMonetaryTotal: LegalMonetaryTotalSchema,
  invoiceLines: z.array(InvoiceLineItemSchema).min(1),
})

// Credit Note (381) - BillingReference is mandatory according to CamInvoice validation
export const CreditNoteDocSchema = z.object({
  id: z.string().min(1),
  issueDate: z.string().min(1),
  invoiceTypeCode: z.literal('381'),
  documentCurrencyCode: z.string().min(1),
  accountingSupplierParty: AccountingPartySchema,
  accountingCustomerParty: AccountingPartySchema,
  note: z.string().optional(),
  billingReference: z.object({ invoiceId: z.string().min(1), invoiceUuid: z.string().optional() }), // REQUIRED for Credit Notes
  invoiceDocumentReferences: z.array(AdditionalDocumentReferenceSchema).optional(),
  taxTotal: TaxTotalSchema,
  legalMonetaryTotal: LegalMonetaryTotalSchema,
  creditNoteLines: z.array(InvoiceLineItemSchema).min(1),
})

// Debit Note (383) - BillingReference is mandatory according to CamInvoice validation
export const DebitNoteDocSchema = z.object({
  id: z.string().min(1),
  issueDate: z.string().min(1),
  invoiceTypeCode: z.literal('383'),
  documentCurrencyCode: z.string().min(1),
  accountingSupplierParty: AccountingPartySchema,
  accountingCustomerParty: AccountingPartySchema,
  note: z.string().optional(),
  billingReference: z.object({ invoiceId: z.string().min(1), invoiceUuid: z.string().optional() }), // REQUIRED for Debit Notes
  invoiceDocumentReferences: z.array(AdditionalDocumentReferenceSchema).optional(),
  taxTotal: TaxTotalSchema,
  legalMonetaryTotal: LegalMonetaryTotalSchema, // will render as RequestedMonetaryTotal
  debitNoteLines: z.array(InvoiceLineItemSchema).min(1),
})

// Parse helpers
export function validateInvoicePayload(input: unknown) {
  return UBLInvoiceSchema.parse(input)
}

export function validateCreditNotePayload(input: unknown) {
  return CreditNoteDocSchema.parse(input)
}

export function validateDebitNotePayload(input: unknown) {
  return DebitNoteDocSchema.parse(input)
}

