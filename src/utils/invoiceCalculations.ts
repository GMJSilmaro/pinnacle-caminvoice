import {
  InvoiceLineFormItem,
  AllowanceChargeFormItem,
  TaxTotal,
  TaxSubtotal,
  LegalMonetaryTotal,
  TAX_SCHEMES,
  TaxCategory
} from '../types/invoice'

/**
 * Calculate tax amount for a line item based on enabled taxes
 */
export function calculateLineItemTaxes(lineItem: InvoiceLineFormItem): {
  taxSubtotals: TaxSubtotal[]
  totalTaxAmount: number
} {
  const taxSubtotals: TaxSubtotal[] = []
  let totalTaxAmount = 0

  // Calculate VAT if enabled
  if (lineItem.taxes.vat.enabled) {
    const taxAmount = (lineItem.lineExtensionAmount * lineItem.taxes.vat.percent) / 100
    taxSubtotals.push({
      taxableAmount: lineItem.lineExtensionAmount,
      taxAmount,
      taxCategory: {
        id: 'S',
        percent: lineItem.taxes.vat.percent,
        taxScheme: TAX_SCHEMES.VAT
      }
    })
    totalTaxAmount += taxAmount
  }

  // Calculate SP if enabled
  if (lineItem.taxes.sp.enabled) {
    const taxAmount = (lineItem.lineExtensionAmount * lineItem.taxes.sp.percent) / 100
    taxSubtotals.push({
      taxableAmount: lineItem.lineExtensionAmount,
      taxAmount,
      taxCategory: {
        id: 'S',
        percent: lineItem.taxes.sp.percent,
        taxScheme: TAX_SCHEMES.SP
      }
    })
    totalTaxAmount += taxAmount
  }

  // Calculate PLT if enabled
  if (lineItem.taxes.plt.enabled) {
    const taxAmount = (lineItem.lineExtensionAmount * lineItem.taxes.plt.percent) / 100
    taxSubtotals.push({
      taxableAmount: lineItem.lineExtensionAmount,
      taxAmount,
      taxCategory: {
        id: 'S',
        percent: lineItem.taxes.plt.percent,
        taxScheme: TAX_SCHEMES.PLT
      }
    })
    totalTaxAmount += taxAmount
  }

  // Calculate AT if enabled
  if (lineItem.taxes.at.enabled) {
    const taxAmount = (lineItem.lineExtensionAmount * lineItem.taxes.at.percent) / 100
    taxSubtotals.push({
      taxableAmount: lineItem.lineExtensionAmount,
      taxAmount,
      taxCategory: {
        id: 'S',
        percent: lineItem.taxes.at.percent,
        taxScheme: TAX_SCHEMES.AT
      }
    })
    totalTaxAmount += taxAmount
  }

  return { taxSubtotals, totalTaxAmount }
}

/**
 * Calculate document-level tax totals by aggregating all line items
 */
export function calculateDocumentTaxTotals(
  lineItems: InvoiceLineFormItem[],
  allowanceCharges: AllowanceChargeFormItem[] = []
): TaxTotal {
  const taxSubtotalsByScheme: Record<string, TaxSubtotal> = {}

  // Aggregate taxes from line items
  lineItems.forEach(lineItem => {
    const { taxSubtotals } = calculateLineItemTaxes(lineItem)
    
    taxSubtotals.forEach(subtotal => {
      const schemeId = subtotal.taxCategory.taxScheme.id
      const key = `${schemeId}-${subtotal.taxCategory.percent}`
      
      if (taxSubtotalsByScheme[key]) {
        taxSubtotalsByScheme[key].taxableAmount += subtotal.taxableAmount
        taxSubtotalsByScheme[key].taxAmount += subtotal.taxAmount
      } else {
        taxSubtotalsByScheme[key] = { ...subtotal }
      }
    })
  })

  // Add taxes from allowance charges if any
  allowanceCharges.forEach(charge => {
    if (charge.taxable && charge.taxPercent) {
      const taxAmount = (charge.amount * charge.taxPercent) / 100
      const key = `VAT-${charge.taxPercent}` // Assuming allowance charges use VAT
      
      if (taxSubtotalsByScheme[key]) {
        taxSubtotalsByScheme[key].taxableAmount += charge.amount
        taxSubtotalsByScheme[key].taxAmount += taxAmount
      } else {
        taxSubtotalsByScheme[key] = {
          taxableAmount: charge.amount,
          taxAmount,
          taxCategory: {
            id: 'S',
            percent: charge.taxPercent,
            taxScheme: TAX_SCHEMES.VAT
          }
        }
      }
    }
  })

  const taxSubtotals = Object.values(taxSubtotalsByScheme)
  const totalTaxAmount = taxSubtotals.reduce((sum, subtotal) => sum + subtotal.taxAmount, 0)

  return {
    taxAmount: totalTaxAmount,
    taxSubtotals
  }
}

/**
 * Calculate legal monetary totals for the invoice
 */
export function calculateLegalMonetaryTotal(
  lineItems: InvoiceLineFormItem[],
  allowanceCharges: AllowanceChargeFormItem[] = [],
  prepaidAmount: number = 0
): LegalMonetaryTotal {
  // Line extension amount (sum of all line amounts before tax)
  const lineExtensionAmount = lineItems.reduce((sum, item) => sum + item.lineExtensionAmount, 0)

  // Calculate allowances and charges
  const allowanceTotalAmount = allowanceCharges
    .filter(charge => !charge.isCharge)
    .reduce((sum, allowance) => sum + allowance.amount, 0)

  const chargeTotalAmount = allowanceCharges
    .filter(charge => charge.isCharge)
    .reduce((sum, charge) => sum + charge.amount, 0)

  // Tax exclusive amount (line extension + charges - allowances)
  const taxExclusiveAmount = lineExtensionAmount + chargeTotalAmount - allowanceTotalAmount

  // Calculate total tax amount
  const taxTotal = calculateDocumentTaxTotals(lineItems, allowanceCharges)
  const totalTaxAmount = taxTotal.taxAmount

  // Tax inclusive amount
  const taxInclusiveAmount = taxExclusiveAmount + totalTaxAmount

  // Payable amount (after prepaid amount)
  const payableAmount = taxInclusiveAmount - prepaidAmount

  return {
    lineExtensionAmount,
    taxExclusiveAmount,
    taxInclusiveAmount,
    allowanceTotalAmount: allowanceTotalAmount > 0 ? allowanceTotalAmount : undefined,
    chargeTotalAmount: chargeTotalAmount > 0 ? chargeTotalAmount : undefined,
    prepaidAmount: prepaidAmount > 0 ? prepaidAmount : undefined,
    payableAmount
  }
}

/**
 * Update line item calculations when quantity or price changes
 */
export function updateLineItemCalculations(lineItem: InvoiceLineFormItem): InvoiceLineFormItem {
  // Calculate line extension amount (quantity * unit price)
  const lineExtensionAmount = lineItem.quantity * lineItem.unitPrice

  // Calculate total tax amount
  const updatedLineItem = { ...lineItem, lineExtensionAmount }
  const { totalTaxAmount } = calculateLineItemTaxes(updatedLineItem)

  return {
    ...updatedLineItem,
    totalTaxAmount
  }
}

/**
 * Create a new empty line item with default values
 */
export function createEmptyLineItem(): InvoiceLineFormItem {
  return {
    id: Date.now().toString(),
    description: '',
    name: '',
    quantity: 1,
    unitCode: 'none',
    unitPrice: 0,
    taxes: {
      vat: { enabled: false, percent: 10 },
      sp: { enabled: false, percent: 10 },
      plt: { enabled: false, percent: 5 },
      at: { enabled: false, percent: 2 }
    },
    lineExtensionAmount: 0,
    totalTaxAmount: 0
  }
}

/**
 * Create a new empty allowance/charge item
 */
export function createEmptyAllowanceCharge(): AllowanceChargeFormItem {
  return {
    id: Date.now().toString(),
    isCharge: false,
    reason: '',
    amount: 0,
    taxable: false,
    taxPercent: 10
  }
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Round amount to 2 decimal places
 */
export function roundAmount(amount: number): number {
  return Math.round(amount * 100) / 100
}

/**
 * Validate if exchange rate is required
 */
export function isExchangeRateRequired(currency: string): boolean {
  return currency !== 'KHR'
}

/**
 * Get tax breakdown summary for display
 */
export function getTaxBreakdownSummary(taxTotal: TaxTotal): Array<{
  taxScheme: string
  taxableAmount: number
  taxAmount: number
  percent: number
}> {
  return taxTotal.taxSubtotals.map(subtotal => ({
    taxScheme: subtotal.taxCategory.taxScheme.name,
    taxableAmount: subtotal.taxableAmount,
    taxAmount: subtotal.taxAmount,
    percent: subtotal.taxCategory.percent
  }))
}
