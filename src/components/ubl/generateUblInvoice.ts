import { UBLInvoice, InvoiceLineItem, TaxSubtotal } from '../../types/invoice'

function xmlEscape(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function currencyAttr(currency: string) {
  return ` currencyID="${xmlEscape(currency)}"`
}

function renderParty(ublParty: UBLInvoice['accountingSupplierParty']): string {
  const p = ublParty.party
  return (`<cac:Party>`+
    (p.endpointId ? `<cbc:EndpointID>${xmlEscape(p.endpointId)}</cbc:EndpointID>` : '')+
    `<cac:PartyName><cbc:Name>${xmlEscape(p.partyName)}</cbc:Name></cac:PartyName>`+
    `<cac:PostalAddress>`+
      (p.postalAddress.floor ? `<cbc:Floor>${xmlEscape(p.postalAddress.floor)}</cbc:Floor>` : '')+
      (p.postalAddress.room ? `<cbc:Room>${xmlEscape(p.postalAddress.room)}</cbc:Room>` : '')+
      `<cbc:StreetName>${xmlEscape(p.postalAddress.streetName)}</cbc:StreetName>`+
      (p.postalAddress.additionalStreetName ? `<cbc:AdditionalStreetName>${xmlEscape(p.postalAddress.additionalStreetName)}</cbc:AdditionalStreetName>` : '')+
      (p.postalAddress.buildingName ? `<cbc:BuildingName>${xmlEscape(p.postalAddress.buildingName)}</cbc:BuildingName>` : '')+
      `<cbc:CityName>${xmlEscape(p.postalAddress.cityName)}</cbc:CityName>`+
      (p.postalAddress.postalZone ? `<cbc:PostalZone>${xmlEscape(p.postalAddress.postalZone)}</cbc:PostalZone>` : '')+
      `<cac:Country><cbc:IdentificationCode>${xmlEscape(p.postalAddress.countryIdentificationCode)}</cbc:IdentificationCode></cac:Country>`+
    `</cac:PostalAddress>`+
    `<cac:PartyTaxScheme>`+
      `<cbc:CompanyID>${xmlEscape(p.partyTaxScheme.companyId)}</cbc:CompanyID>`+
      `<cac:TaxScheme><cbc:ID>${xmlEscape(p.partyTaxScheme.taxScheme.id)}</cbc:ID></cac:TaxScheme>`+
    `</cac:PartyTaxScheme>`+
    `<cac:PartyLegalEntity>`+
      `<cbc:RegistrationName>${xmlEscape(p.partyLegalEntity.registrationName)}</cbc:RegistrationName>`+
      `<cbc:CompanyID>${xmlEscape(p.partyLegalEntity.companyId)}</cbc:CompanyID>`+
    `</cac:PartyLegalEntity>`+
    (p.contact ? (`<cac:Contact>`+
      (p.contact.telephone ? `<cbc:Telephone>${xmlEscape(p.contact.telephone)}</cbc:Telephone>` : '')+
      (p.contact.electronicMail ? `<cbc:ElectronicMail>${xmlEscape(p.contact.electronicMail)}</cbc:ElectronicMail>` : '')+
    `</cac:Contact>`) : '')+
  `</cac:Party>`)
}

function renderTaxTotal(tax: UBLInvoice['taxTotal'], currency: string): string {
  const subtotals = (tax.taxSubtotals || []) as TaxSubtotal[]
  return (`<cac:TaxTotal>`+
    `<cbc:TaxAmount${currencyAttr(currency)}>${xmlEscape(tax.taxAmount)}</cbc:TaxAmount>`+
    subtotals.map(st => (
      `<cac:TaxSubtotal>`+
        `<cbc:TaxableAmount${currencyAttr(currency)}>${xmlEscape(st.taxableAmount)}</cbc:TaxableAmount>`+
        `<cbc:TaxAmount${currencyAttr(currency)}>${xmlEscape(st.taxAmount)}</cbc:TaxAmount>`+
        `<cac:TaxCategory>`+
          `<cbc:ID>${xmlEscape(st.taxCategory.id)}</cbc:ID>`+
          `<cbc:Percent>${xmlEscape(st.taxCategory.percent)}</cbc:Percent>`+
          `<cac:TaxScheme><cbc:ID>${xmlEscape(st.taxCategory.taxScheme.id)}</cbc:ID></cac:TaxScheme>`+
        `</cac:TaxCategory>`+
      `</cac:TaxSubtotal>`
    )).join('')+
  `</cac:TaxTotal>`)
}

function renderLine(line: InvoiceLineItem, currency: string): string {
  const taxSubtotal = line.taxTotal?.taxSubtotals?.[0]
  return (`<cac:InvoiceLine>`+
    `<cbc:ID>${xmlEscape(line.id)}</cbc:ID>`+
    `<cbc:InvoicedQuantity unitCode="${xmlEscape(line.unitCode)}">${xmlEscape(line.invoicedQuantity)}</cbc:InvoicedQuantity>`+
    `<cbc:LineExtensionAmount${currencyAttr(currency)}>${xmlEscape(line.lineExtensionAmount)}</cbc:LineExtensionAmount>`+
    (line.taxTotal ? (
      `<cac:TaxTotal>`+
        `<cbc:TaxAmount${currencyAttr(currency)}>${xmlEscape(line.taxTotal.taxAmount)}</cbc:TaxAmount>`+
        (taxSubtotal ? (
          `<cac:TaxSubtotal>`+
            `<cbc:TaxAmount${currencyAttr(currency)}>${xmlEscape(taxSubtotal.taxAmount)}</cbc:TaxAmount>`+
            `<cac:TaxCategory>`+
              `<cbc:ID>${xmlEscape(taxSubtotal.taxCategory.id)}</cbc:ID>`+
              `<cbc:Percent>${xmlEscape(taxSubtotal.taxCategory.percent)}</cbc:Percent>`+
              `<cac:TaxScheme><cbc:ID>${xmlEscape(taxSubtotal.taxCategory.taxScheme.id)}</cbc:ID></cac:TaxScheme>`+
            `</cac:TaxCategory>`+
          `</cac:TaxSubtotal>`
        ) : '')+
      `</cac:TaxTotal>`
    ) : '')+
    `<cac:Item>`+
      (line.item.description ? `<cbc:Description>${xmlEscape(line.item.description)}</cbc:Description>` : '')+
      `<cbc:Name>${xmlEscape(line.item.name)}</cbc:Name>`+
    `</cac:Item>`+
    `<cac:Price>`+
      `<cbc:PriceAmount${currencyAttr(currency)}>${xmlEscape(line.price.priceAmount)}</cbc:PriceAmount>`+
    `</cac:Price>`+
  `</cac:InvoiceLine>`)
}

export function generateUblInvoice(ubl: UBLInvoice): string {
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
      (ubl.additionalDocumentReferences?.length ? ubl.additionalDocumentReferences.map(ref => (
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
        renderParty(ubl.accountingSupplierParty)+
      `</cac:AccountingSupplierParty>`+
      `<cac:AccountingCustomerParty>`+
        renderParty(ubl.accountingCustomerParty)+
      `</cac:AccountingCustomerParty>`+
      (ubl.paymentTerms ? `<cac:PaymentTerms><cbc:Note>${xmlEscape(ubl.paymentTerms.note)}</cbc:Note></cac:PaymentTerms>` : '')+
      (typeof ubl.legalMonetaryTotal.prepaidAmount === 'number' ? `<cac:PrepaidPayment><cbc:PaidAmount${currencyAttr(currency)}>${xmlEscape(ubl.legalMonetaryTotal.prepaidAmount)}</cbc:PaidAmount></cac:PrepaidPayment>` : '')+
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
      (ubl.invoiceLines || []).map(li => renderLine(li, currency)).join('')+
    `</Invoice>`
  )
  return xml
}

export default generateUblInvoice

