import * as XLSX from 'xlsx'

export interface ExcelTemplateRow {
  invoiceNumber: string
  customerId: string
  issueDate: string
  dueDate: string
  currency: string
  paymentTerms: string
  lineItems: string // JSON string
}

export const CURRENCY_CODES = ['KHR', 'USD', 'EUR', 'THB']
export const TAX_OPTIONS = ['VAT', 'SP', 'PLT', 'AT']

export function generateInvoiceTemplate(maxLineItems: number = 5): void {
  // Generate column headers for dynamic number of line items
  // Default is 5, but can be configured
  const lineItemColumns = []
  for (let i = 1; i <= maxLineItems; i++) {
    lineItemColumns.push(
      `item${i}_description`,  // Item description
      `item${i}_name`,         // Item name
      `item${i}_quantity`,     // Quantity
      `item${i}_unitCode`,     // Unit code (piece, kg, liter, hour, day, month, year, meter, sqm)
      `item${i}_unitPrice`,    // Unit price
      `item${i}_taxScheme`,    // Tax scheme (VAT, SP, PLT, AT)
      `item${i}_allowanceReason`, // Allowance reason (optional) - ChargeIndicator: false
      `item${i}_allowanceAmount`, // Allowance amount (optional) - ChargeIndicator: false
      `item${i}_chargeReason`,    // Charge reason (optional) - ChargeIndicator: true
      `item${i}_chargeAmount`     // Charge amount (optional) - ChargeIndicator: true
    )
  }

  const templateData = [
    // Header row with all required fields for CamInvoice UBL structure
    [
      'invoiceNumber',           // Invoice ID (required)
      'customerId',             // Customer ID from your system (required)
      'issueDate',              // Issue Date (required) - YYYY-MM-DD format
      'dueDate',                // Due Date (optional) - YYYY-MM-DD format
      'currency',               // Document Currency Code (required) - KHR, USD, EUR, THB
      'invoiceTypeCode',        // Invoice Type Code (required) - 380 or 388
      
      // Supplier Party Information (Required for UBL)
      'supplierEndpointId',     // Supplier Endpoint ID (required)
      'supplierName',           // Supplier Business Name (required)
      'supplierTaxId',          // Supplier Tax ID (required)
      'supplierRegistrationNumber', // Supplier Registration Number (required)
      'supplierAddress',        // Supplier Address (required)
      'supplierCity',           // Supplier City (required)
      'supplierCountry',        // Supplier Country (required)
      'supplierEmail',          // Supplier Email (optional)
      'supplierPhone',          // Supplier Phone (optional)
      
      // Customer Party Information (Required for UBL)
      'customerEndpointId',     // Customer Endpoint ID (optional)
      'customerName',           // Customer Business Name (required)
      'customerTaxId',          // Customer Tax ID (optional)
      'customerRegistrationNumber', // Customer Registration Number (optional)
      'customerAddress',        // Customer Address (required)
      'customerCity',           // Customer City (required)
      'customerCountry',        // Customer Country (required)
      'customerEmail',          // Customer Email (optional)
      'customerPhone',          // Customer Phone (optional)
      
      // Additional Fields
      'paymentTerms',           // Payment Terms (optional)
      'notes',                  // Additional Notes (optional)
      'terms',                  // Terms and Conditions (optional)
      
      // Line Item Fields (up to 3 items per row)
      ...lineItemColumns
    ],
    // Example row 1 - Single line item
    [
      'INV-2024-001',
      'REPLACE_WITH_CUSTOMER_ID',  // customerId - Use actual customer ID from your system
      '2024-01-15', 
      '2024-02-15', 
      'KHR', 
      '388',
      
      // Supplier Info
      'KHUID00001234', 
      'Your Company Ltd', 
      '123456789', 
      'REG-2024-001', 
      '123 Main Street, Phnom Penh', 
      'Phnom Penh', 
      'KH', 
      'contact@yourcompany.com', 
      '+855-23-123-456',
      
      // Customer Info
      'KHUID00005678', 
      'Customer Company Ltd', 
      '987654321', 
      'CUST-2024-001', 
      '456 Business Ave, Phnom Penh', 
      'Phnom Penh', 
      'KH', 
      'customer@example.com', 
      '+855-23-987-654',
      
      // Additional
      'Net 30 days', 
      'Thank you for your business', 
      'Payment due within 30 days of invoice date',
      
      // Item 1
      'Product 1',        // item1_description
      'Product 1',        // item1_name
      2,                  // item1_quantity
      'piece',            // item1_unitCode
      100,                // item1_unitPrice
      'VAT',              // item1_taxScheme
      '',                 // item1_allowanceReason
      '',                 // item1_allowanceAmount
      '',                 // item1_chargeReason
      '',                 // item1_chargeAmount
      
      // Item 2 (empty)
      '', '', '', '', '', '', '', '', '', '',
      
      // Item 3 (empty)
      '', '', '', '', '', '', '', '', '', '',
      
      // Item 4 (empty)
      '', '', '', '', '', '', '', '', '', '',
      
      // Item 5 (empty)
      '', '', '', '', '', '', '', '', '', ''
    ],
    // Example row 2 - Two line items
    [
      'INV-2024-002',
      'REPLACE_WITH_CUSTOMER_ID',  // customerId - Use actual customer ID from your system
      '2024-01-16', 
      '2024-02-16', 
      'USD', 
      '380',
      
      // Supplier Info
      'KHUID00001234', 
      'Your Company Ltd', 
      '123456789', 
      'REG-2024-001', 
      '123 Main Street, Phnom Penh', 
      'Phnom Penh', 
      'KH', 
      'contact@yourcompany.com', 
      '+855-23-123-456',
      
      // Customer Info
      'KHUID00005679', 
      'Service Client Inc', 
      '111222333', 
      'CUST-2024-002', 
      '789 Service Road, Phnom Penh', 
      'Phnom Penh', 
      'KH', 
      'service@client.com', 
      '+855-23-111-222',
      
      // Additional
      'Net 15 days', 
      'Service invoice', 
      'Payment due within 15 days',
      
      // Item 1
      'Consultation Service',  // item1_description
      'Professional Service',  // item1_name
      5,                       // item1_quantity
      'hour',                  // item1_unitCode
      50,                      // item1_unitPrice
      'VAT',                   // item1_taxScheme
      '',                      // item1_allowanceReason
      '',                      // item1_allowanceAmount
      '',                      // item1_chargeReason
      '',                      // item1_chargeAmount
      
      // Item 2
      'Project Management',     // item2_description
      'PM Service',            // item2_name
      3,                       // item2_quantity
      'day',                   // item2_unitCode
      200,                     // item2_unitPrice
      'VAT',                   // item2_taxScheme
      '',                      // item2_allowanceReason
      '',                      // item2_allowanceAmount
      '',                      // item2_chargeReason
      '',                      // item2_chargeAmount
      
      // Item 3 (empty)
      '', '', '', '', '', '', '', '', '', '',
      
      // Item 4 (empty)
      '', '', '', '', '', '', '', '', '', '',
      
      // Item 5 (empty)
      '', '', '', '', '', '', '', '', '', ''
    ],
    // Example row 3 - Three line items
    [
      'INV-2024-003',
      'REPLACE_WITH_CUSTOMER_ID',  // customerId - Use actual customer ID from your system
      '2024-01-17', 
      '2024-02-17', 
      'KHR', 
      '388',
      
      // Supplier Info
      'KHUID00001234', 
      'Your Company Ltd', 
      '123456789', 
      'REG-2024-001', 
      '123 Main Street, Phnom Penh', 
      'Phnom Penh', 
      'KH', 
      'contact@yourcompany.com', 
      '+855-23-123-456',
      
      // Customer Info
      'KHUID00005680', 
      'Bulk Buyer Corp', 
      '444555666', 
      'CUST-2024-003', 
      '321 Bulk Street, Phnom Penh', 
      'Phnom Penh', 
      'KH', 
      'bulk@buyer.com', 
      '+855-23-444-555',
      
      // Additional
      'Cash on delivery', 
      'Bulk order', 
      'COD only',
      
      // Item 1
      'Premium Product A',      // item1_description
      'Product A',              // item1_name
      10,                       // item1_quantity
      'piece',                  // item1_unitCode
      500,                      // item1_unitPrice
      'VAT',                    // item1_taxScheme
      'Volume discount',        // item1_allowanceReason
      50,                       // item1_allowanceAmount
      '',                       // item1_chargeReason
      '',                       // item1_chargeAmount
      
      // Item 2
      'Standard Product B',     // item2_description
      'Product B',              // item2_name
      5,                        // item2_quantity
      'kg',                     // item2_unitCode
      150,                      // item2_unitPrice
      'SP',                     // item2_taxScheme
      '',                       // item2_allowanceReason
      '',                       // item2_allowanceAmount
      'Shipping fee',           // item2_chargeReason
      10,                       // item2_chargeAmount
      
      // Item 3
      'Express Shipping',        // item3_description
      'Delivery Service',        // item3_name
      1,                        // item3_quantity
      'day',                    // item3_unitCode
      25,                       // item3_unitPrice
      'VAT',                    // item3_taxScheme
      '',                       // item3_allowanceReason
      '',                       // item3_allowanceAmount
      '',                       // item3_chargeReason
      '',                       // item3_chargeAmount
      
      // Item 4 (empty)
      '', '', '', '', '', '', '', '', '', '',
      
      // Item 5 (empty)
      '', '', '', '', '', '', '', '', '', ''
    ]
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(templateData)
  
  // Set column widths for better readability
  const columnWidths = [
    { wch: 15 }, // invoiceNumber
    { wch: 15 }, // customerId
    { wch: 12 }, // issueDate
    { wch: 12 }, // dueDate
    { wch: 8 },  // currency
    { wch: 12 }, // invoiceTypeCode
    
    // Supplier columns
    { wch: 18 }, // supplierEndpointId
    { wch: 20 }, // supplierName
    { wch: 15 }, // supplierTaxId
    { wch: 20 }, // supplierRegistrationNumber
    { wch: 30 }, // supplierAddress
    { wch: 15 }, // supplierCity
    { wch: 10 }, // supplierCountry
    { wch: 25 }, // supplierEmail
    { wch: 15 }, // supplierPhone
    
    // Customer columns
    { wch: 18 }, // customerEndpointId
    { wch: 20 }, // customerName
    { wch: 15 }, // customerTaxId
    { wch: 20 }, // customerRegistrationNumber
    { wch: 30 }, // customerAddress
    { wch: 15 }, // customerCity
    { wch: 10 }, // customerCountry
    { wch: 25 }, // customerEmail
    { wch: 15 }, // customerPhone
    
    // Additional columns
    { wch: 15 }, // paymentTerms
    { wch: 25 }, // notes
    { wch: 25 }  // terms
  ]

  // Add widths for line item columns (maxLineItems items × 10 fields per item)
  for (let i = 1; i <= maxLineItems; i++) {
    columnWidths.push(
      { wch: 20 }, // itemN_description
      { wch: 15 }, // itemN_name
      { wch: 10 }, // itemN_quantity
      { wch: 10 }, // itemN_unitCode
      { wch: 12 }, // itemN_unitPrice
      { wch: 10 }, // itemN_taxScheme
      { wch: 20 }, // itemN_allowanceReason
      { wch: 12 }, // itemN_allowanceAmount
      { wch: 20 }, // itemN_chargeReason
      { wch: 12 }  // itemN_chargeAmount
    )
  }

  worksheet['!cols'] = columnWidths

  // Create instructions sheet explaining AllowanceCharge and ChargeIndicator
  const instructionsData = [
    ['CamInvoice Bulk Upload Template - Instructions'],
    [''],
    ['LINE ITEMS - ALLOWANCE & CHARGE'],
    [''],
    ['Allowance/Charge Fields Explanation:'],
    [''],
    ['Allowance (ChargeIndicator: false)'],
    ['  - item{N}_allowanceReason: Reason for discount/reduction (optional)'],
    ['  - item{N}_allowanceAmount: Amount to subtract from line item (optional)'],
    ['  - Example: "Volume discount", 50'],
    [''],
    ['Charge (ChargeIndicator: true)'],
    ['  - item{N}_chargeReason: Reason for additional fee (optional)'],
    ['  - item{N}_chargeAmount: Amount to add to line item (optional)'],
    ['  - Example: "Shipping fee", 10'],
    [''],
    ['XML Specification:'],
    ['  - ChargeIndicator: false = Allowance (discount/reduction)'],
    ['  - ChargeIndicator: true = Charge (additional fee)'],
    ['  - AllowanceChargeReason: Optional [0..n]'],
    ['  - Amount: Mandatory [1..1] when allowance/charge is used'],
    [''],
    ['Example Usage:'],
    ['  - Item with allowance: Fill item1_allowanceReason and item1_allowanceAmount'],
    ['  - Item with charge: Fill item1_chargeReason and item1_chargeAmount'],
    ['  - Item with both: Fill all four fields'],
    ['  - Item without allowance/charge: Leave all four fields empty'],
    [''],
    ['Note: Amount must be greater than 0 if provided.'],
  ]

  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData)
  instructionsSheet['!cols'] = [{ wch: 80 }] // Wide column for instructions

  const workbook = XLSX.utils.book_new()
  // Add Invoice Template as the first sheet (index 0) - this is what the parser expects
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice Template')
  // Add Instructions as the second sheet (index 1)
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')
  
  XLSX.writeFile(workbook, 'caminvoice-bulk-upload-template.xlsx')
}

export function parseInvoiceExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('No data found in file'))
          return
        }

        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (jsonData.length < 2) {
          reject(new Error('Excel file must contain at least a header row and one data row'))
          return
        }

        const headers = jsonData[0] as string[]
        const rows = jsonData.slice(1) as any[][]

        const parsedInvoices = rows.map((row, index) => {
          const invoice: any = {}
          const lineItems: any[] = []
          
          headers.forEach((header, colIndex) => {
            const value = row[colIndex]
            if (header && value !== undefined && value !== null && value !== '') {
              // Handle old JSON format for lineItems
              if (header.toLowerCase().includes('lineitems') && typeof value === 'string') {
                try {
                  invoice.lineItems = JSON.parse(value)
                } catch {
                  invoice.lineItems = []
                }
              } else if (header.startsWith('item') && header.includes('_')) {
                // Handle new column-based format (e.g., item1_description, item1_name, etc.)
                // This is handled separately below
              } else {
                invoice[header] = value
              }
            }
          })

          // Parse line items from column-based format
          // Look for pattern: item{N}_{field}
          const itemsMap = new Map<number, any>()
          
          headers.forEach((header, colIndex) => {
            const value = row[colIndex]
            if (header && header.startsWith('item') && header.includes('_')) {
              const match = header.match(/^item(\d+)_(.+)$/)
              if (match) {
                const itemNumber = parseInt(match[1])
                const field = match[2]
                
                if (itemsMap.has(itemNumber)) {
                  itemsMap.get(itemNumber)[field] = value
                } else {
                  itemsMap.set(itemNumber, { [field]: value })
                }
              }
            }
          })

          // Convert map to array and validate items
          itemsMap.forEach((item, itemNumber) => {
            // Only include items that have at least a description (not empty)
            if (item.description && item.description.toString().trim() !== '') {
              // Parse numeric fields
              const parsedItem: any = {
                description: item.description?.toString() || '',
                name: item.name?.toString() || item.description?.toString() || '',
                quantity: parseFloat(item.quantity) || 0,
                unitCode: item.unitCode?.toString() || 'piece',
                unitPrice: parseFloat(item.unitPrice) || 0,
                taxScheme: item.taxScheme?.toString() || 'VAT',
                allowanceReason: item.allowanceReason?.toString() || '',
                allowanceAmount: parseFloat(item.allowanceAmount) || 0,
                chargeReason: item.chargeReason?.toString() || '',
                chargeAmount: parseFloat(item.chargeAmount) || 0
              }
              lineItems.push(parsedItem)
            }
          })

          // If we parsed line items from columns, use them; otherwise keep the old JSON format (if any)
          if (lineItems.length > 0 || !invoice.lineItems) {
            invoice.lineItems = lineItems
          }

          // Skip rows that are completely empty (no meaningful cell content)
          const hasAnyValue = (row as any[]).some((cell) => {
            if (cell === undefined || cell === null) return false
            if (typeof cell === 'string') return cell.trim() !== ''
            return true
          })

          return hasAnyValue ? invoice : null
        }).filter((inv) => inv !== null)

        resolve(parsedInvoices as any[])
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsBinaryString(file)
  })
}

export function validateInvoiceData(invoice: any, customers: { value: string; label: string }[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Basic required fields validation
  if (!invoice.invoiceNumber) errors.push('Invoice number is required')
  if (!invoice.issueDate) errors.push('Issue date is required')
  if (!invoice.currency) errors.push('Currency is required')
  if (!invoice.invoiceTypeCode) errors.push('Invoice type code is required')

  // Supplier Party validation (Required for UBL)
  if (!invoice.supplierEndpointId) errors.push('Supplier Endpoint ID is required')
  if (!invoice.supplierName) errors.push('Supplier Name is required')
  if (!invoice.supplierTaxId) errors.push('Supplier Tax ID is required')
  if (!invoice.supplierRegistrationNumber) errors.push('Supplier Registration Number is required')
  if (!invoice.supplierAddress) errors.push('Supplier Address is required')
  if (!invoice.supplierCity) errors.push('Supplier City is required')
  if (!invoice.supplierCountry) errors.push('Supplier Country is required')

  // Customer Party validation (Required for UBL)
  if (!invoice.customerName) errors.push('Customer Name is required')
  if (!invoice.customerAddress) errors.push('Customer Address is required')
  if (!invoice.customerCity) errors.push('Customer City is required')
  if (!invoice.customerCountry) errors.push('Customer Country is required')


  // Currency validation
  if (invoice.currency && !CURRENCY_CODES.includes(invoice.currency)) {
    errors.push(`Invalid currency. Must be one of: ${CURRENCY_CODES.join(', ')}`)
  }

  // Invoice type code validation
  if (invoice.invoiceTypeCode && !['380', '388'].includes(invoice.invoiceTypeCode)) {
    errors.push('Invalid invoice type code. Must be 380 (Standard) or 388 (Tax Invoice)')
  }

  // Date validation
  if (invoice.issueDate) {
    const issueDate = new Date(invoice.issueDate)
    if (isNaN(issueDate.getTime())) {
      errors.push('Invalid issue date format. Use YYYY-MM-DD')
    }
  }

  if (invoice.dueDate) {
    const dueDate = new Date(invoice.dueDate)
    if (isNaN(dueDate.getTime())) {
      errors.push('Invalid due date format. Use YYYY-MM-DD')
    }
  }

  // Email validation (if provided)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (invoice.supplierEmail && !emailRegex.test(invoice.supplierEmail)) {
    errors.push('Invalid supplier email format')
  }
  if (invoice.customerEmail && !emailRegex.test(invoice.customerEmail)) {
    errors.push('Invalid customer email format')
  }

  // Line items validation
  if (!invoice.lineItems || !Array.isArray(invoice.lineItems) || invoice.lineItems.length === 0) {
    errors.push('At least one line item is required')
  } else {
    invoice.lineItems.forEach((item: any, itemIndex: number) => {
      if (!item.description) errors.push(`Line item ${itemIndex + 1}: Description is required`)
      if (!item.name) errors.push(`Line item ${itemIndex + 1}: Name is required`)
      if (!item.quantity || item.quantity <= 0) errors.push(`Line item ${itemIndex + 1}: Valid quantity is required`)
      if (!item.unitPrice || item.unitPrice < 0) errors.push(`Line item ${itemIndex + 1}: Valid unit price is required`)
      if (!item.unitCode) errors.push(`Line item ${itemIndex + 1}: Unit code is required`)
      if (!item.taxScheme || !TAX_OPTIONS.includes(item.taxScheme)) {
        errors.push(`Line item ${itemIndex + 1}: Valid tax scheme is required (VAT, SP, PLT, AT)`)
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function calculateInvoiceTotals(lineItems: any[]): { subtotal: number; taxAmount: number; totalAmount: number } {
  const subtotal = lineItems.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unitPrice
    const allowanceAmount = item.allowanceAmount || 0
    const chargeAmount = item.chargeAmount || 0
    return sum + itemTotal - allowanceAmount + chargeAmount
  }, 0)
  const taxAmount = lineItems.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unitPrice
    const allowanceAmount = item.allowanceAmount || 0
    const chargeAmount = item.chargeAmount || 0
    const itemSubtotal = itemTotal - allowanceAmount + chargeAmount
    return sum + (item.taxScheme === 'VAT' ? itemSubtotal * 0.1 : 0)
  }, 0)
  const totalAmount = subtotal + taxAmount

  return { subtotal, taxAmount, totalAmount }
}

// ============================================================================
// CREDIT NOTE TEMPLATE & PARSING
// ============================================================================

export function generateCreditNoteTemplate(maxLineItems: number = 5): void {
  const lineItemColumns = []
  for (let i = 1; i <= maxLineItems; i++) {
    lineItemColumns.push(
      `item${i}_description`,
      `item${i}_name`,
      `item${i}_quantity`,
      `item${i}_unitCode`,
      `item${i}_unitPrice`,
      `item${i}_taxScheme`,
      `item${i}_allowanceReason`,
      `item${i}_allowanceAmount`,
      `item${i}_chargeReason`,
      `item${i}_chargeAmount`
    )
  }

  const templateData = [
    [
      'creditNoteNumber',
      'customerId',
      'invoiceTypeCode',         // 381 for Credit Note, 383 for Debit Note (auto-detected)
      'originalInvoiceNumber',   // Required - Invoice number (e.g., INV-2024-001)
      'originalInvoiceUuid',     // Optional - Invoice UUID from CamInvoice (will be looked up if not provided)
      'issueDate',
      'currency',
      'reason',                  // Reason for credit note
      'description',             // Description (matching manual input)
      'notes',                   // Additional notes
      
      // Supplier Party Information
      'supplierEndpointId',
      'supplierName',
      'supplierTaxId',
      'supplierRegistrationNumber',
      'supplierAddress',
      'supplierCity',
      'supplierCountry',
      'supplierEmail',
      'supplierPhone',
      
      // Customer Party Information
      'customerEndpointId',
      'customerName',
      'customerTaxId',
      'customerRegistrationNumber',
      'customerAddress',
      'customerCity',
      'customerCountry',
      'customerEmail',
      'customerPhone',
      
      // Line Items
      ...lineItemColumns
    ],
    // Example row
    [
      'CN-2024-001',
      'REPLACE_WITH_CUSTOMER_ID',
      '381',                     // Invoice Type Code: 381 = Credit Note, 383 = Debit Note
      'INV-2024-001',            // Invoice number (required for BillingReference)
      'b29bf297-96bc-4268-9ff2-fb6e283e4eef', // Invoice UUID (optional - will be looked up if not provided)
      '2024-01-15',
      'KHR',
      'Product return',
      'Customer returned defective product',
      'Customer returned defective product',
      
      // Supplier Info
      'KHUID00001234',
      'Your Company Ltd',
      '123456789',
      'REG-2024-001',
      '123 Main Street, Phnom Penh',
      'Phnom Penh',
      'KH',
      'contact@yourcompany.com',
      '+855-23-123-456',
      
      // Customer Info
      'KHUID00005678',
      'Customer Corp',
      '987654321',
      'CUST-2024-001',
      '456 Customer Street, Phnom Penh',
      'Phnom Penh',
      'KH',
      'customer@corp.com',
      '+855-23-987-654',
      
      // Item 1
      'Defective Product A',
      'Product A',
      2,
      'piece',
      100,
      'VAT',
      '',
      '',
      '',
      '',
      
      // Item 2-5 (empty)
      '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', ''
    ]
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(templateData)
  
  const columnWidths = [
    { wch: 18 }, // creditNoteNumber
    { wch: 15 }, // customerId
    { wch: 12 }, // invoiceTypeCode
    { wch: 18 }, // originalInvoiceNumber
    { wch: 40 }, // originalInvoiceUuid
    { wch: 12 }, // issueDate
    { wch: 8 },  // currency
    { wch: 20 }, // reason
    { wch: 30 }, // description
    { wch: 30 }, // notes
    
    // Supplier columns
    { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 15 },
    
    // Customer columns
    { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 15 },
    
    // Line item columns
    ...Array(maxLineItems * 10).fill({ wch: 15 })
  ]

  worksheet['!cols'] = columnWidths

  // Instructions sheet
  const instructionsData = [
    ['CamInvoice Credit Note Bulk Upload Template - Instructions'],
    [''],
    ['CREDIT NOTE REQUIREMENTS:'],
    [''],
    ['Required Fields:'],
    ['  - creditNoteNumber: Unique credit note identifier'],
    ['  - customerId: Customer ID from your system'],
    ['  - invoiceTypeCode: 381 for Credit Note, 383 for Debit Note (REQUIRED)'],
    ['  - originalInvoiceNumber: Invoice number of the original invoice (REQUIRED)'],
    ['  - issueDate: Credit note issue date (YYYY-MM-DD)'],
    ['  - currency: Document currency (KHR, USD, EUR, THB)'],
    ['  - reason: Reason for the credit note'],
    ['  - description: Detailed description'],
    [''],
    ['Invoice Type Codes:'],
    ['  - 381: Credit Note'],
    ['  - 383: Debit Note'],
    ['  - The invoiceTypeCode determines the document type and is used for identification'],
    [''],
    ['BillingReference (Required for CamInvoice):'],
    ['  - Credit Notes MUST reference the original Invoice'],
    ['  - originalInvoiceNumber: Required - Invoice number (e.g., INV-2024-001)'],
    ['  - originalInvoiceUuid: Optional - Invoice UUID from CamInvoice'],
    ['  - If UUID is not provided, it will be looked up from the invoice number'],
    ['  - BillingReference structure: <cac:BillingReference><cac:InvoiceDocumentReference>'],
    ['    <cbc:ID>originalInvoiceNumber</cbc:ID>'],
    ['    <cbc:UUID>originalInvoiceUuid</cbc:UUID>'],
    ['    </cac:InvoiceDocumentReference></cac:BillingReference>'],
    [''],
    ['Line Items: Same structure as Invoice template'],
    ['  - Supports allowance and charge fields'],
    ['  - ChargeIndicator: false for allowance, true for charge'],
    [''],
    ['Note: Amount must be greater than 0 if provided.'],
  ]

  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData)
  instructionsSheet['!cols'] = [{ wch: 80 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Credit Note Template')
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')
  
  XLSX.writeFile(workbook, 'caminvoice-credit-note-bulk-upload-template.xlsx')
}

// ============================================================================
// DEBIT NOTE TEMPLATE & PARSING
// ============================================================================

export function generateDebitNoteTemplate(maxLineItems: number = 5): void {
  const lineItemColumns = []
  for (let i = 1; i <= maxLineItems; i++) {
    lineItemColumns.push(
      `item${i}_description`,
      `item${i}_name`,
      `item${i}_quantity`,
      `item${i}_unitCode`,
      `item${i}_unitPrice`,
      `item${i}_taxScheme`,
      `item${i}_allowanceReason`,
      `item${i}_allowanceAmount`,
      `item${i}_chargeReason`,
      `item${i}_chargeAmount`
    )
  }

  const templateData = [
    [
      'debitNoteNumber',
      'customerId',
      'invoiceTypeCode',         // 381 for Credit Note, 383 for Debit Note (auto-detected)
      'originalInvoiceNumber',   // Required - Invoice number (e.g., INV-2024-001)
      'originalInvoiceUuid',     // Optional - Invoice UUID from CamInvoice (will be looked up if not provided)
      'issueDate',
      'currency',
      'reason',                  // Reason for debit note
      'description',             // Description (matching manual input)
      'notes',                   // Additional notes
      
      // Supplier Party Information
      'supplierEndpointId',
      'supplierName',
      'supplierTaxId',
      'supplierRegistrationNumber',
      'supplierAddress',
      'supplierCity',
      'supplierCountry',
      'supplierEmail',
      'supplierPhone',
      
      // Customer Party Information
      'customerEndpointId',
      'customerName',
      'customerTaxId',
      'customerRegistrationNumber',
      'customerAddress',
      'customerCity',
      'customerCountry',
      'customerEmail',
      'customerPhone',
      
      // Line Items
      ...lineItemColumns
    ],
    // Example row
    [
      'DN-2024-001',
      'REPLACE_WITH_CUSTOMER_ID',
      '383',                     // Invoice Type Code: 381 = Credit Note, 383 = Debit Note
      'INV-2024-001',            // Invoice number (required for BillingReference)
      'b29bf297-96bc-4268-9ff2-fb6e283e4eef', // Invoice UUID (optional - will be looked up if not provided)
      '2024-01-15',
      'KHR',
      'Additional service charge',
      'Late payment fee applied',
      'Late payment fee applied',
      
      // Supplier Info
      'KHUID00001234',
      'Your Company Ltd',
      '123456789',
      'REG-2024-001',
      '123 Main Street, Phnom Penh',
      'Phnom Penh',
      'KH',
      'contact@yourcompany.com',
      '+855-23-123-456',
      
      // Customer Info
      'KHUID00005678',
      'Customer Corp',
      '987654321',
      'CUST-2024-001',
      '456 Customer Street, Phnom Penh',
      'Phnom Penh',
      'KH',
      'customer@corp.com',
      '+855-23-987-654',
      
      // Item 1
      'Late Payment Fee',
      'Service Fee',
      1,
      'piece',
      50,
      'VAT',
      '',
      '',
      '',
      '',
      
      // Item 2-5 (empty)
      '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', ''
    ]
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(templateData)
  
  const columnWidths = [
    { wch: 18 }, // debitNoteNumber
    { wch: 15 }, // customerId
    { wch: 12 }, // invoiceTypeCode
    { wch: 18 }, // originalInvoiceNumber
    { wch: 40 }, // originalInvoiceUuid
    { wch: 12 }, // issueDate
    { wch: 8 },  // currency
    { wch: 20 }, // reason
    { wch: 30 }, // description
    { wch: 30 }, // notes
    
    // Supplier columns
    { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 15 },
    
    // Customer columns
    { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 15 },
    
    // Line item columns
    ...Array(maxLineItems * 10).fill({ wch: 15 })
  ]

  worksheet['!cols'] = columnWidths

  // Instructions sheet
  const instructionsData = [
    ['CamInvoice Debit Note Bulk Upload Template - Instructions'],
    [''],
    ['DEBIT NOTE REQUIREMENTS:'],
    [''],
    ['Required Fields:'],
    ['  - debitNoteNumber: Unique debit note identifier'],
    ['  - customerId: Customer ID from your system'],
    ['  - invoiceTypeCode: 381 for Credit Note, 383 for Debit Note (REQUIRED)'],
    ['  - originalInvoiceNumber: Invoice number of the original invoice (REQUIRED)'],
    ['  - issueDate: Debit note issue date (YYYY-MM-DD)'],
    ['  - currency: Document currency (KHR, USD, EUR, THB)'],
    ['  - reason: Reason for the debit note'],
    ['  - description: Detailed description'],
    [''],
    ['Invoice Type Codes:'],
    ['  - 381: Credit Note'],
    ['  - 383: Debit Note'],
    ['  - The invoiceTypeCode determines the document type and is used for identification'],
    [''],
    ['BillingReference (Required for CamInvoice):'],
    ['  - Debit Notes MUST reference the original Invoice'],
    ['  - originalInvoiceNumber: Required - Invoice number (e.g., INV-2024-001)'],
    ['  - originalInvoiceUuid: Optional - Invoice UUID from CamInvoice'],
    ['  - If UUID is not provided, it will be looked up from the invoice number'],
    ['  - BillingReference structure: <cac:BillingReference><cac:InvoiceDocumentReference>'],
    ['    <cbc:ID>originalInvoiceNumber</cbc:ID>'],
    ['    <cbc:UUID>originalInvoiceUuid</cbc:UUID>'],
    ['    </cac:InvoiceDocumentReference></cac:BillingReference>'],
    [''],
    ['Line Items: Same structure as Invoice template'],
    ['  - Supports allowance and charge fields'],
    ['  - ChargeIndicator: false for allowance, true for charge'],
    [''],
    ['Note: Amount must be greater than 0 if provided.'],
  ]

  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData)
  instructionsSheet['!cols'] = [{ wch: 80 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Debit Note Template')
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')
  
  XLSX.writeFile(workbook, 'caminvoice-debit-note-bulk-upload-template.xlsx')
}

export function parseCreditNoteExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('No data found in file'))
          return
        }

        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (jsonData.length < 2) {
          reject(new Error('Excel file must contain at least a header row and one data row'))
          return
        }

        const headers = jsonData[0] as string[]
        const rows = jsonData.slice(1) as any[][]

        const parsedCreditNotes = rows.map((row, index) => {
          const creditNote: any = {}
          const lineItems: any[] = []
          
          headers.forEach((header, colIndex) => {
            const value = row[colIndex]
            if (header && value !== undefined && value !== null && value !== '') {
              if (header.startsWith('item') && header.includes('_')) {
                // Handle column-based format for line items
              } else {
                creditNote[header] = value
              }
            }
          })

          // Parse line items from column-based format
          const itemsMap = new Map<number, any>()
          headers.forEach((header, colIndex) => {
            if (header && header.startsWith('item') && header.includes('_')) {
              const match = header.match(/^item(\d+)_(.+)$/)
              if (match) {
                const itemNumber = parseInt(match[1], 10)
                const field = match[2]
                const value = row[colIndex]
                
                if (!itemsMap.has(itemNumber)) {
                  itemsMap.set(itemNumber, {})
                }
                const item = itemsMap.get(itemNumber)!
                item[field] = value
              }
            }
          })

          itemsMap.forEach((item, itemNumber) => {
            if (item.description && item.description.toString().trim() !== '') {
              const parsedItem: any = {
                description: item.description?.toString() || '',
                name: item.name?.toString() || item.description?.toString() || '',
                quantity: parseFloat(item.quantity) || 0,
                unitCode: item.unitCode?.toString() || 'piece',
                unitPrice: parseFloat(item.unitPrice) || 0,
                taxScheme: item.taxScheme?.toString() || 'VAT',
                allowanceReason: item.allowanceReason?.toString() || '',
                allowanceAmount: parseFloat(item.allowanceAmount) || 0,
                chargeReason: item.chargeReason?.toString() || '',
                chargeAmount: parseFloat(item.chargeAmount) || 0
              }
              lineItems.push(parsedItem)
            }
          })

          if (lineItems.length > 0 || !creditNote.lineItems) {
            creditNote.lineItems = lineItems
          }

          const hasAnyValue = (row as any[]).some((cell) => {
            if (cell === undefined || cell === null) return false
            if (typeof cell === 'string') return cell.trim() !== ''
            return true
          })

          return hasAnyValue ? creditNote : null
        }).filter((cn) => cn !== null)

        resolve(parsedCreditNotes as any[])
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsBinaryString(file)
  })
}

export function parseDebitNoteExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('No data found in file'))
          return
        }

        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (jsonData.length < 2) {
          reject(new Error('Excel file must contain at least a header row and one data row'))
          return
        }

        const headers = jsonData[0] as string[]
        const rows = jsonData.slice(1) as any[][]

        const parsedDebitNotes = rows.map((row, index) => {
          const debitNote: any = {}
          const lineItems: any[] = []
          
          headers.forEach((header, colIndex) => {
            const value = row[colIndex]
            if (header && value !== undefined && value !== null && value !== '') {
              if (header.startsWith('item') && header.includes('_')) {
                // Handle column-based format for line items
              } else {
                debitNote[header] = value
              }
            }
          })

          // Parse line items from column-based format
          const itemsMap = new Map<number, any>()
          headers.forEach((header, colIndex) => {
            if (header && header.startsWith('item') && header.includes('_')) {
              const match = header.match(/^item(\d+)_(.+)$/)
              if (match) {
                const itemNumber = parseInt(match[1], 10)
                const field = match[2]
                const value = row[colIndex]
                
                if (!itemsMap.has(itemNumber)) {
                  itemsMap.set(itemNumber, {})
                }
                const item = itemsMap.get(itemNumber)!
                item[field] = value
              }
            }
          })

          itemsMap.forEach((item, itemNumber) => {
            if (item.description && item.description.toString().trim() !== '') {
              const parsedItem: any = {
                description: item.description?.toString() || '',
                name: item.name?.toString() || item.description?.toString() || '',
                quantity: parseFloat(item.quantity) || 0,
                unitCode: item.unitCode?.toString() || 'piece',
                unitPrice: parseFloat(item.unitPrice) || 0,
                taxScheme: item.taxScheme?.toString() || 'VAT',
                allowanceReason: item.allowanceReason?.toString() || '',
                allowanceAmount: parseFloat(item.allowanceAmount) || 0,
                chargeReason: item.chargeReason?.toString() || '',
                chargeAmount: parseFloat(item.chargeAmount) || 0
              }
              lineItems.push(parsedItem)
            }
          })

          if (lineItems.length > 0 || !debitNote.lineItems) {
            debitNote.lineItems = lineItems
          }

          const hasAnyValue = (row as any[]).some((cell) => {
            if (cell === undefined || cell === null) return false
            if (typeof cell === 'string') return cell.trim() !== ''
            return true
          })

          return hasAnyValue ? debitNote : null
        }).filter((dn) => dn !== null)

        resolve(parsedDebitNotes as any[])
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsBinaryString(file)
  })
}

export function validateCreditNoteData(creditNote: any, customers: { value: string; label: string }[], invoices?: { value: string; label: string }[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!creditNote.creditNoteNumber) errors.push('Credit note number is required')
  if (!creditNote.issueDate) errors.push('Issue date is required')
  if (!creditNote.currency) errors.push('Currency is required')
  if (!creditNote.invoiceTypeCode) {
    // Auto-detect if not provided - default to 381 for credit note
    creditNote.invoiceTypeCode = '381'
  } else if (creditNote.invoiceTypeCode !== '381' && creditNote.invoiceTypeCode !== '383') {
    errors.push('Invalid invoice type code. Must be 381 (Credit Note) or 383 (Debit Note)')
  }
  if (!creditNote.originalInvoiceNumber && !creditNote.originalInvoiceId) errors.push('Original Invoice Number is required (Credit Notes must reference the original invoice)')
  if (!creditNote.customerId) errors.push('Customer ID is required')
  if (!creditNote.reason) errors.push('Reason is required')
  if (!creditNote.description) errors.push('Description is required')

  // Supplier Party validation
  if (!creditNote.supplierEndpointId) errors.push('Supplier Endpoint ID is required')
  if (!creditNote.supplierName) errors.push('Supplier Name is required')
  if (!creditNote.supplierTaxId) errors.push('Supplier Tax ID is required')
  if (!creditNote.supplierRegistrationNumber) errors.push('Supplier Registration Number is required')
  if (!creditNote.supplierAddress) errors.push('Supplier Address is required')
  if (!creditNote.supplierCity) errors.push('Supplier City is required')
  if (!creditNote.supplierCountry) errors.push('Supplier Country is required')

  // Customer Party validation
  if (!creditNote.customerName) errors.push('Customer Name is required')
  if (!creditNote.customerAddress) errors.push('Customer Address is required')
  if (!creditNote.customerCity) errors.push('Customer City is required')
  if (!creditNote.customerCountry) errors.push('Customer Country is required')

  // Currency validation
  if (creditNote.currency && !CURRENCY_CODES.includes(creditNote.currency)) {
    errors.push(`Invalid currency. Must be one of: ${CURRENCY_CODES.join(', ')}`)
  }

  // Date validation
  if (creditNote.issueDate) {
    const issueDate = new Date(creditNote.issueDate)
    if (isNaN(issueDate.getTime())) {
      errors.push('Invalid issue date format. Use YYYY-MM-DD')
    }
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (creditNote.supplierEmail && !emailRegex.test(creditNote.supplierEmail)) {
    errors.push('Invalid supplier email format')
  }
  if (creditNote.customerEmail && !emailRegex.test(creditNote.customerEmail)) {
    errors.push('Invalid customer email format')
  }

  // Line items validation
  if (!creditNote.lineItems || !Array.isArray(creditNote.lineItems) || creditNote.lineItems.length === 0) {
    errors.push('At least one line item is required')
  } else {
    creditNote.lineItems.forEach((item: any, itemIndex: number) => {
      if (!item.description) errors.push(`Line item ${itemIndex + 1}: Description is required`)
      if (!item.name) errors.push(`Line item ${itemIndex + 1}: Name is required`)
      if (!item.quantity || item.quantity <= 0) errors.push(`Line item ${itemIndex + 1}: Valid quantity is required`)
      if (!item.unitPrice || item.unitPrice < 0) errors.push(`Line item ${itemIndex + 1}: Valid unit price is required`)
      if (!item.unitCode) errors.push(`Line item ${itemIndex + 1}: Unit code is required`)
      if (!item.taxScheme || !TAX_OPTIONS.includes(item.taxScheme)) {
        errors.push(`Line item ${itemIndex + 1}: Valid tax scheme is required (VAT, SP, PLT, AT)`)
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateDebitNoteData(debitNote: any, customers: { value: string; label: string }[], invoices?: { value: string; label: string }[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!debitNote.debitNoteNumber) errors.push('Debit note number is required')
  if (!debitNote.issueDate) errors.push('Issue date is required')
  if (!debitNote.currency) errors.push('Currency is required')
  if (!debitNote.invoiceTypeCode) {
    // Auto-detect if not provided - default to 383 for debit note
    debitNote.invoiceTypeCode = '383'
  } else if (debitNote.invoiceTypeCode !== '381' && debitNote.invoiceTypeCode !== '383') {
    errors.push('Invalid invoice type code. Must be 381 (Credit Note) or 383 (Debit Note)')
  }
  if (!debitNote.originalInvoiceNumber && !debitNote.originalInvoiceId) errors.push('Original Invoice Number is required (Debit Notes must reference the original invoice)')
  if (!debitNote.customerId) errors.push('Customer ID is required')
  if (!debitNote.reason) errors.push('Reason is required')
  if (!debitNote.description) errors.push('Description is required')

  // Supplier Party validation
  if (!debitNote.supplierEndpointId) errors.push('Supplier Endpoint ID is required')
  if (!debitNote.supplierName) errors.push('Supplier Name is required')
  if (!debitNote.supplierTaxId) errors.push('Supplier Tax ID is required')
  if (!debitNote.supplierRegistrationNumber) errors.push('Supplier Registration Number is required')
  if (!debitNote.supplierAddress) errors.push('Supplier Address is required')
  if (!debitNote.supplierCity) errors.push('Supplier City is required')
  if (!debitNote.supplierCountry) errors.push('Supplier Country is required')

  // Customer Party validation
  if (!debitNote.customerName) errors.push('Customer Name is required')
  if (!debitNote.customerAddress) errors.push('Customer Address is required')
  if (!debitNote.customerCity) errors.push('Customer City is required')
  if (!debitNote.customerCountry) errors.push('Customer Country is required')

  // Currency validation
  if (debitNote.currency && !CURRENCY_CODES.includes(debitNote.currency)) {
    errors.push(`Invalid currency. Must be one of: ${CURRENCY_CODES.join(', ')}`)
  }

  // Date validation
  if (debitNote.issueDate) {
    const issueDate = new Date(debitNote.issueDate)
    if (isNaN(issueDate.getTime())) {
      errors.push('Invalid issue date format. Use YYYY-MM-DD')
    }
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (debitNote.supplierEmail && !emailRegex.test(debitNote.supplierEmail)) {
    errors.push('Invalid supplier email format')
  }
  if (debitNote.customerEmail && !emailRegex.test(debitNote.customerEmail)) {
    errors.push('Invalid customer email format')
  }

  // Line items validation
  if (!debitNote.lineItems || !Array.isArray(debitNote.lineItems) || debitNote.lineItems.length === 0) {
    errors.push('At least one line item is required')
  } else {
    debitNote.lineItems.forEach((item: any, itemIndex: number) => {
      if (!item.description) errors.push(`Line item ${itemIndex + 1}: Description is required`)
      if (!item.name) errors.push(`Line item ${itemIndex + 1}: Name is required`)
      if (!item.quantity || item.quantity <= 0) errors.push(`Line item ${itemIndex + 1}: Valid quantity is required`)
      if (!item.unitPrice || item.unitPrice < 0) errors.push(`Line item ${itemIndex + 1}: Valid unit price is required`)
      if (!item.unitCode) errors.push(`Line item ${itemIndex + 1}: Unit code is required`)
      if (!item.taxScheme || !TAX_OPTIONS.includes(item.taxScheme)) {
        errors.push(`Line item ${itemIndex + 1}: Valid tax scheme is required (VAT, SP, PLT, AT)`)
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function calculateCreditNoteTotals(lineItems: any[]): { subtotal: number; taxAmount: number; totalAmount: number } {
  return calculateInvoiceTotals(lineItems) // Same calculation logic
}

export function calculateDebitNoteTotals(lineItems: any[]): { subtotal: number; taxAmount: number; totalAmount: number } {
  return calculateInvoiceTotals(lineItems) // Same calculation logic
}

