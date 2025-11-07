// CamInvoice XML Builder utility
// Builds XML for Invoice, Credit Note, and Debit Note following CamInvoice mapping
// See docs:
// - Invoice: https://doc-caminv.netlify.app/invoice-structure/invoice
// - Credit Note: https://doc-caminv.netlify.app/invoice-structure/credit-note
// - Debit Note: https://doc-caminv.netlify.app/invoice-structure/debit-note

import { UBLInvoice, InvoiceLineItem, TaxSubtotal, AdditionalDocumentReference } from '@/types/invoice'

function xmlEscape(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function currencyAttr(currency?: string) {
  return currency ? ` currencyID="${xmlEscape(currency)}"` : ''
}

function renderParty(ublParty: UBLInvoice['accountingSupplierParty']): string {
  const p = ublParty.party
  return (
    `<cac:Party>` +
      (p.endpointId ? `<cbc:EndpointID>${xmlEscape(p.endpointId)}</cbc:EndpointID>` : '') +
      `<cac:PartyName><cbc:Name>${xmlEscape(p.partyName)}</cbc:Name></cac:PartyName>` +
      `<cac:PostalAddress>` +
        (p.postalAddress.floor ? `<cbc:Floor>${xmlEscape(p.postalAddress.floor)}</cbc:Floor>` : '') +
        (p.postalAddress.room ? `<cbc:Room>${xmlEscape(p.postalAddress.room)}</cbc:Room>` : '') +
        `<cbc:StreetName>${xmlEscape(p.postalAddress.streetName)}</cbc:StreetName>` +
        (p.postalAddress.additionalStreetName ? `<cbc:AdditionalStreetName>${xmlEscape(p.postalAddress.additionalStreetName)}</cbc:AdditionalStreetName>` : '') +
        (p.postalAddress.buildingName ? `<cbc:BuildingName>${xmlEscape(p.postalAddress.buildingName)}</cbc:BuildingName>` : '') +
        `<cbc:CityName>${xmlEscape(p.postalAddress.cityName)}</cbc:CityName>` +
        (p.postalAddress.postalZone ? `<cbc:PostalZone>${xmlEscape(p.postalAddress.postalZone)}</cbc:PostalZone>` : '') +
        `<cac:Country><cbc:IdentificationCode>${xmlEscape(p.postalAddress.countryIdentificationCode)}</cbc:IdentificationCode></cac:Country>` +
      `</cac:PostalAddress>` +
      `<cac:PartyTaxScheme>` +
        `<cbc:CompanyID>${xmlEscape(p.partyTaxScheme.companyId)}</cbc:CompanyID>` +
        `<cac:TaxScheme><cbc:ID>${xmlEscape(p.partyTaxScheme.taxScheme.id)}</cbc:ID></cac:TaxScheme>` +
      `</cac:PartyTaxScheme>` +
      `<cac:PartyLegalEntity>` +
        `<cbc:RegistrationName>${xmlEscape(p.partyLegalEntity.registrationName)}</cbc:RegistrationName>` +
        `<cbc:CompanyID>${xmlEscape(p.partyLegalEntity.companyId)}</cbc:CompanyID>` +
      `</cac:PartyLegalEntity>` +
      (p.contact ? (
        `<cac:Contact>` +
          (p.contact.telephone ? `<cbc:Telephone>${xmlEscape(p.contact.telephone)}</cbc:Telephone>` : '') +
          (p.contact.electronicMail ? `<cbc:ElectronicMail>${xmlEscape(p.contact.electronicMail)}</cbc:ElectronicMail>` : '') +
        `</cac:Contact>`
      ) : '') +
    `</cac:Party>`
  )
}

function renderTaxTotal(tax: UBLInvoice['taxTotal'], currency: string): string {
  const subtotals = (tax.taxSubtotals || []) as TaxSubtotal[]
  return (
    `<cac:TaxTotal>` +
      `<cbc:TaxAmount${currencyAttr(currency)}>${xmlEscape(tax.taxAmount)}</cbc:TaxAmount>` +
      subtotals.map(st => (
        `<cac:TaxSubtotal>` +
          `<cbc:TaxableAmount${currencyAttr(currency)}>${xmlEscape(st.taxableAmount)}</cbc:TaxableAmount>` +
          `<cbc:TaxAmount${currencyAttr(currency)}>${xmlEscape(st.taxAmount)}</cbc:TaxAmount>` +
          `<cac:TaxCategory>` +
            `<cbc:ID>${xmlEscape(st.taxCategory.id)}</cbc:ID>` +
            `<cbc:Percent>${xmlEscape(st.taxCategory.percent)}</cbc:Percent>` +
            `<cac:TaxScheme><cbc:ID>${xmlEscape(st.taxCategory.taxScheme.id)}</cbc:ID></cac:TaxScheme>` +
          `</cac:TaxCategory>` +
        `</cac:TaxSubtotal>`
      )).join('') +
    `</cac:TaxTotal>`
  )
}

function renderAllowanceCharge(allowanceCharge: { chargeIndicator: boolean; allowanceChargeReason?: string; amount: number }, currency: string): string {
  return (
    `<cac:AllowanceCharge>` +
      `<cbc:ChargeIndicator>${allowanceCharge.chargeIndicator ? 'true' : 'false'}</cbc:ChargeIndicator>` +
      (allowanceCharge.allowanceChargeReason ? `<cbc:AllowanceChargeReason>${xmlEscape(allowanceCharge.allowanceChargeReason)}</cbc:AllowanceChargeReason>` : '') +
      `<cbc:Amount${currencyAttr(currency)}>${xmlEscape(allowanceCharge.amount)}</cbc:Amount>` +
    `</cac:AllowanceCharge>`
  )
}

function renderLine(line: InvoiceLineItem, currency: string, opts: { root: 'InvoiceLine' | 'CreditNoteLine' | 'DebitNoteLine', qtyTag: 'InvoicedQuantity' | 'CreditedQuantity' | 'DebitedQuantity' }): string {
  const taxSubtotal = line.taxTotal?.taxSubtotals?.[0]
  return (
    `<cac:${opts.root}>` +
      `<cbc:ID>${xmlEscape(line.id)}</cbc:ID>` +
      `<cbc:${opts.qtyTag} unitCode="${xmlEscape(line.unitCode)}">${xmlEscape(line.invoicedQuantity)}</cbc:${opts.qtyTag}>` +
      `<cbc:LineExtensionAmount${currencyAttr(currency)}>${xmlEscape(line.lineExtensionAmount)}</cbc:LineExtensionAmount>` +
      (line.allowanceCharges && line.allowanceCharges.length > 0 ? line.allowanceCharges.map(ac => renderAllowanceCharge(ac, currency)).join('') : '') +
      (line.taxTotal ? (
        `<cac:TaxTotal>` +
          `<cbc:TaxAmount${currencyAttr(currency)}>${xmlEscape(line.taxTotal.taxAmount)}</cbc:TaxAmount>` +
          (taxSubtotal ? (
            `<cac:TaxSubtotal>` +
              `<cbc:TaxableAmount${currencyAttr(currency)}>${xmlEscape(taxSubtotal.taxableAmount)}</cbc:TaxableAmount>` +
              `<cbc:TaxAmount${currencyAttr(currency)}>${xmlEscape(taxSubtotal.taxAmount)}</cbc:TaxAmount>` +
              `<cac:TaxCategory>` +
                `<cbc:ID>${xmlEscape(taxSubtotal.taxCategory.id)}</cbc:ID>` +
                `<cbc:Percent>${xmlEscape(taxSubtotal.taxCategory.percent)}</cbc:Percent>` +
                `<cac:TaxScheme><cbc:ID>${xmlEscape(taxSubtotal.taxCategory.taxScheme.id)}</cbc:ID></cac:TaxScheme>` +
              `</cac:TaxCategory>` +
            `</cac:TaxSubtotal>`
          ) : '') +
        `</cac:TaxTotal>`
      ) : '') +
      `<cac:Item>` +
        (line.item.description ? `<cbc:Description>${xmlEscape(line.item.description)}</cbc:Description>` : '') +
        `<cbc:Name>${xmlEscape(line.item.name)}</cbc:Name>` +
        (taxSubtotal ? (
          `<cac:ClassifiedTaxCategory>` +
            `<cbc:ID>${xmlEscape(taxSubtotal.taxCategory.id)}</cbc:ID>` +
            `<cbc:Percent>${xmlEscape(taxSubtotal.taxCategory.percent)}</cbc:Percent>` +
            `<cac:TaxScheme><cbc:ID>${xmlEscape(taxSubtotal.taxCategory.taxScheme.id)}</cbc:ID></cac:TaxScheme>` +
          `</cac:ClassifiedTaxCategory>`
        ) : '') +
      `</cac:Item>` +
      `<cac:Price>` +
        `<cbc:PriceAmount${currencyAttr(currency)}>${xmlEscape(line.price.priceAmount)}</cbc:PriceAmount>` +
      `</cac:Price>` +
    `</cac:${opts.root}>`
  )
}

// ===== Invoice (TypeCode 380 or 388). No Note, No BillingReference, No InvoiceDocumentReference.
export function buildInvoiceXml(ubl: UBLInvoice & { invoiceTypeCode: '380' | '388' }): string {
  const currency = ubl.documentCurrencyCode
  const xml = (
    `<Invoice xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"`+
    ` xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"`+
    ` xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">`+
      `<cbc:UBLVersionID>2.1</cbc:UBLVersionID>`+
      `<cbc:ID>${xmlEscape(ubl.id)}</cbc:ID>`+
      `<cbc:IssueDate>${xmlEscape(ubl.issueDate)}</cbc:IssueDate>`+
      (ubl.dueDate ? `<cbc:DueDate>${xmlEscape(ubl.dueDate)}</cbc:DueDate>` : '')+
      `<cbc:InvoiceTypeCode listID="UN/ECE 1001 Subset">${xmlEscape(ubl.invoiceTypeCode)}</cbc:InvoiceTypeCode>`+
      `<cbc:DocumentCurrencyCode>${xmlEscape(ubl.documentCurrencyCode)}</cbc:DocumentCurrencyCode>`+
      `<cac:AccountingSupplierParty>`+
        renderParty(ubl.accountingSupplierParty)+
      `</cac:AccountingSupplierParty>`+
      `<cac:AccountingCustomerParty>`+
        renderParty(ubl.accountingCustomerParty)+
      `</cac:AccountingCustomerParty>`+
      renderTaxTotal(ubl.taxTotal, currency)+
      `<cac:LegalMonetaryTotal>`+
        `<cbc:LineExtensionAmount${currencyAttr(currency)}>${xmlEscape(ubl.legalMonetaryTotal.lineExtensionAmount)}</cbc:LineExtensionAmount>`+
        `<cbc:TaxExclusiveAmount${currencyAttr(currency)}>${xmlEscape(ubl.legalMonetaryTotal.taxExclusiveAmount)}</cbc:TaxExclusiveAmount>`+
        `<cbc:TaxInclusiveAmount${currencyAttr(currency)}>${xmlEscape(ubl.legalMonetaryTotal.taxInclusiveAmount)}</cbc:TaxInclusiveAmount>`+
        (typeof ubl.legalMonetaryTotal.allowanceTotalAmount === 'number' ? `<cbc:AllowanceTotalAmount${currencyAttr(currency)}>${xmlEscape(ubl.legalMonetaryTotal.allowanceTotalAmount)}</cbc:AllowanceTotalAmount>` : '')+
        (typeof ubl.legalMonetaryTotal.chargeTotalAmount === 'number' ? `<cbc:ChargeTotalAmount${currencyAttr(currency)}>${xmlEscape(ubl.legalMonetaryTotal.chargeTotalAmount)}</cbc:ChargeTotalAmount>` : '')+
        (typeof ubl.legalMonetaryTotal.prepaidAmount === 'number' ? `<cbc:PrepaidAmount${currencyAttr(currency)}>${xmlEscape(ubl.legalMonetaryTotal.prepaidAmount)}</cbc:PrepaidAmount>` : '')+
        `<cbc:PayableAmount${currencyAttr(currency)}>${xmlEscape(ubl.legalMonetaryTotal.payableAmount)}</cbc:PayableAmount>`+
      `</cac:LegalMonetaryTotal>`+
      (ubl.invoiceLines || []).map(li => (
        renderLine(li, currency, { root: 'InvoiceLine', qtyTag: 'InvoicedQuantity' })
      )).join('')+
    `</Invoice>`
  )
  return xml
}

// ===== Credit Note (TypeCode 381). Has Note, BillingReference, InvoiceDocumentReference. No DueDate.
export interface CreditNoteDoc extends Omit<UBLInvoice,'invoiceLines'|'dueDate'> {
  invoiceTypeCode: '381'
  note?: string
  billingReference: { invoiceId: string; invoiceUuid?: string } // REQUIRED for Credit Notes
  invoiceDocumentReferences?: AdditionalDocumentReference[]
  creditNoteLines: InvoiceLineItem[]
}

export function buildCreditNoteXml(doc: CreditNoteDoc): string {
  const currency = doc.documentCurrencyCode
  const xml = (
    `<?xml version="1.0" encoding="UTF-8"?>`+
    `<CreditNote xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"`+
    ` xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"`+
    ` xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2">`+
      `<cbc:UBLVersionID>2.1</cbc:UBLVersionID>`+
      `<cbc:ID>${xmlEscape(doc.id)}</cbc:ID>`+
      `<cbc:IssueDate>${xmlEscape(doc.issueDate)}</cbc:IssueDate>`+
      `<cbc:CreditNoteTypeCode listID="UN/ECE 1001 Subset">${xmlEscape(doc.invoiceTypeCode)}</cbc:CreditNoteTypeCode>`+
      (doc.note ? `<cbc:Note>${xmlEscape(doc.note)}</cbc:Note>` : '')+
      `<cbc:DocumentCurrencyCode>${xmlEscape(doc.documentCurrencyCode)}</cbc:DocumentCurrencyCode>`+
      `<cac:BillingReference>`+
        `<cac:InvoiceDocumentReference>`+
          `<cbc:ID>${xmlEscape(doc.billingReference.invoiceId)}</cbc:ID>`+
          (doc.billingReference.invoiceUuid ? `<cbc:UUID>${xmlEscape(doc.billingReference.invoiceUuid)}</cbc:UUID>` : '')+
        `</cac:InvoiceDocumentReference>`+
      `</cac:BillingReference>`+
      (doc.invoiceDocumentReferences?.length ? doc.invoiceDocumentReferences.map(ref => (
        `<cac:AdditionalDocumentReference>`+
          `<cbc:ID>${xmlEscape(ref.id)}</cbc:ID>`+
          (ref.documentDescription ? `<cbc:DocumentDescription>${xmlEscape(ref.documentDescription)}</cbc:DocumentDescription>` : '')+
          (ref.attachment ? (
            `<cac:Attachment>`+
              (ref.attachment.embeddedDocumentBinaryObject ? `<cbc:EmbeddedDocumentBinaryObject>${xmlEscape(ref.attachment.embeddedDocumentBinaryObject)}</cbc:EmbeddedDocumentBinaryObject>` : '')+
              (ref.attachment.externalReferenceUri ? `<cac:ExternalReference><cbc:URI>${xmlEscape(ref.attachment.externalReferenceUri)}</cbc:URI></cac:ExternalReference>` : '')+
            `</cac:Attachment>`
          ) : '')+
        `</cac:AdditionalDocumentReference>`
      )).join('') : '')+
      `<cac:AccountingSupplierParty>`+
        renderParty(doc.accountingSupplierParty)+
      `</cac:AccountingSupplierParty>`+
      `<cac:AccountingCustomerParty>`+
        renderParty(doc.accountingCustomerParty)+
      `</cac:AccountingCustomerParty>`+
      renderTaxTotal(doc.taxTotal, currency)+
      `<cac:LegalMonetaryTotal>`+
        `<cbc:LineExtensionAmount${currencyAttr(currency)}>${xmlEscape(doc.legalMonetaryTotal.lineExtensionAmount)}</cbc:LineExtensionAmount>`+
        `<cbc:TaxExclusiveAmount${currencyAttr(currency)}>${xmlEscape(doc.legalMonetaryTotal.taxExclusiveAmount)}</cbc:TaxExclusiveAmount>`+
        `<cbc:TaxInclusiveAmount${currencyAttr(currency)}>${xmlEscape(doc.legalMonetaryTotal.taxInclusiveAmount)}</cbc:TaxInclusiveAmount>`+
        (typeof doc.legalMonetaryTotal.allowanceTotalAmount === 'number' ? `<cbc:AllowanceTotalAmount${currencyAttr(currency)}>${xmlEscape(doc.legalMonetaryTotal.allowanceTotalAmount)}</cbc:AllowanceTotalAmount>` : '')+
        (typeof doc.legalMonetaryTotal.chargeTotalAmount === 'number' ? `<cbc:ChargeTotalAmount${currencyAttr(currency)}>${xmlEscape(doc.legalMonetaryTotal.chargeTotalAmount)}</cbc:ChargeTotalAmount>` : '')+
        (typeof doc.legalMonetaryTotal.prepaidAmount === 'number' ? `<cbc:PrepaidAmount${currencyAttr(currency)}>${xmlEscape(doc.legalMonetaryTotal.prepaidAmount)}</cbc:PrepaidAmount>` : '')+
        `<cbc:PayableAmount${currencyAttr(currency)}>${xmlEscape(doc.legalMonetaryTotal.payableAmount)}</cbc:PayableAmount>`+
      `</cac:LegalMonetaryTotal>`+
      (doc.creditNoteLines || []).map(li => (
        renderLine(li, currency, { root: 'CreditNoteLine', qtyTag: 'CreditedQuantity' })
      )).join('')+
    `</CreditNote>`
  )
  return xml
}

// ===== Debit Note (TypeCode 383). Has Note, BillingReference (REQUIRED), InvoiceDocumentReference. No DueDate.
// Uses RequestedMonetaryTotal and DebitNoteLine/DebitedQuantity.
// BillingReference is MANDATORY per CamInvoice requirements - a Debit Note must reference an original invoice.
export interface DebitNoteDoc extends Omit<UBLInvoice,'invoiceLines'|'dueDate'> {
  invoiceTypeCode: '383'
  note?: string
  billingReference: { invoiceId: string; invoiceUuid?: string } // REQUIRED - Debit Notes must reference original invoice
  invoiceDocumentReferences?: AdditionalDocumentReference[]
  debitNoteLines: InvoiceLineItem[]
}

export function buildDebitNoteXml(doc: DebitNoteDoc): string {
  const currency = doc.documentCurrencyCode
  const xml = (
    `<?xml version="1.0" encoding="UTF-8"?>`+
    `<DebitNote xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"`+
    ` xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"`+
    ` xmlns="urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2">`+
      `<cbc:UBLVersionID>2.1</cbc:UBLVersionID>`+
      `<cbc:ID>${xmlEscape(doc.id)}</cbc:ID>`+
      `<cbc:IssueDate>${xmlEscape(doc.issueDate)}</cbc:IssueDate>`+
      `<cbc:Note>${xmlEscape(doc.note || '')}</cbc:Note>`+
      `<cbc:DocumentCurrencyCode>${xmlEscape(doc.documentCurrencyCode)}</cbc:DocumentCurrencyCode>`+
      `<cac:BillingReference>`+
        `<cac:InvoiceDocumentReference>`+
          `<cbc:ID>${xmlEscape(doc.billingReference.invoiceId)}</cbc:ID>`+
          (doc.billingReference.invoiceUuid ? `<cbc:UUID>${xmlEscape(doc.billingReference.invoiceUuid)}</cbc:UUID>` : '')+
        `</cac:InvoiceDocumentReference>`+
      `</cac:BillingReference>`+
      (doc.invoiceDocumentReferences?.length ? doc.invoiceDocumentReferences.map(ref => (
        `<cac:AdditionalDocumentReference>`+
          `<cbc:ID>${xmlEscape(ref.id)}</cbc:ID>`+
          (ref.documentDescription ? `<cbc:DocumentDescription>${xmlEscape(ref.documentDescription)}</cbc:DocumentDescription>` : '')+
          (ref.attachment ? (
            `<cac:Attachment>`+
              (ref.attachment.embeddedDocumentBinaryObject ? `<cbc:EmbeddedDocumentBinaryObject>${xmlEscape(ref.attachment.embeddedDocumentBinaryObject)}</cbc:EmbeddedDocumentBinaryObject>` : '')+
              (ref.attachment.externalReferenceUri ? `<cac:ExternalReference><cbc:URI>${xmlEscape(ref.attachment.externalReferenceUri)}</cbc:URI></cac:ExternalReference>` : '')+
            `</cac:Attachment>`
          ) : '')+
        `</cac:AdditionalDocumentReference>`
      )).join('') : '')+
      `<cac:AccountingSupplierParty>`+
        renderParty(doc.accountingSupplierParty)+
      `</cac:AccountingSupplierParty>`+
      `<cac:AccountingCustomerParty>`+
        renderParty(doc.accountingCustomerParty)+
      `</cac:AccountingCustomerParty>`+
      renderTaxTotal(doc.taxTotal, currency)+
      `<cac:RequestedMonetaryTotal>`+
        `<cbc:LineExtensionAmount${currencyAttr(currency)}>${xmlEscape(doc.legalMonetaryTotal.lineExtensionAmount)}</cbc:LineExtensionAmount>`+
        `<cbc:TaxExclusiveAmount${currencyAttr(currency)}>${xmlEscape(doc.legalMonetaryTotal.taxExclusiveAmount)}</cbc:TaxExclusiveAmount>`+
        `<cbc:TaxInclusiveAmount${currencyAttr(currency)}>${xmlEscape(doc.legalMonetaryTotal.taxInclusiveAmount)}</cbc:TaxInclusiveAmount>`+
        (typeof doc.legalMonetaryTotal.allowanceTotalAmount === 'number' ? `<cbc:AllowanceTotalAmount${currencyAttr(currency)}>${xmlEscape(doc.legalMonetaryTotal.allowanceTotalAmount)}</cbc:AllowanceTotalAmount>` : '')+
        (typeof doc.legalMonetaryTotal.chargeTotalAmount === 'number' ? `<cbc:ChargeTotalAmount${currencyAttr(currency)}>${xmlEscape(doc.legalMonetaryTotal.chargeTotalAmount)}</cbc:ChargeTotalAmount>` : '')+
        (typeof doc.legalMonetaryTotal.prepaidAmount === 'number' ? `<cbc:PrepaidAmount${currencyAttr(currency)}>${xmlEscape(doc.legalMonetaryTotal.prepaidAmount)}</cbc:PrepaidAmount>` : '')+
        `<cbc:PayableAmount${currencyAttr(currency)}>${xmlEscape(doc.legalMonetaryTotal.payableAmount)}</cbc:PayableAmount>`+
      `</cac:RequestedMonetaryTotal>`+
      (doc.debitNoteLines || []).map(li => (
        renderLine(li, currency, { root: 'DebitNoteLine', qtyTag: 'DebitedQuantity' })
      )).join('')+
    `</DebitNote>`
  )
  return xml
}

export function buildCamInvXmlByType(doc: UBLInvoice | CreditNoteDoc | DebitNoteDoc): string {
  // Route to proper builder by invoiceTypeCode and selected structure
  // 380/388 -> Invoice, 381 -> CreditNote, 383 -> DebitNote
  const type = (doc as any).invoiceTypeCode
  if (type === '380' || type === '388') return buildInvoiceXml(doc as UBLInvoice & { invoiceTypeCode: '380' | '388' })
  if (type === '381') return buildCreditNoteXml(doc as CreditNoteDoc)
  if (type === '383') return buildDebitNoteXml(doc as DebitNoteDoc)
  throw new Error(`Unsupported invoiceTypeCode: ${type}`)
}

