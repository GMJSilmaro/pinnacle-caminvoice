# Excel Template Enhancement for User-Friendly Line Item Entry

## Summary

We've enhanced the Excel bulk upload template to make it **much easier for non-technical users** to fill out invoices with multiple line items, while maintaining full support for multiple line items per invoice.

## What Changed

### Before
- Line items were stored in a single column as a JSON string
- Example: `[{"description":"Product 1","name":"Product 1","quantity":2,"unitCode":"piece","unitPrice":100,"taxScheme":"VAT"}]`
- Required users to manually type valid JSON syntax
- Very difficult for non-technical users
- Error-prone (missing commas, quotes, brackets, etc.)

### After
- Line items are now entered in **separate columns** for each field
- Columns for up to **3 line items** per invoice:
  - `item1_description`, `item1_name`, `item1_quantity`, `item1_unitCode`, `item1_unitPrice`, `item1_taxScheme`
  - `item2_description`, `item2_name`, `item2_quantity`, `item2_unitCode`, `item2_unitPrice`, `item2_taxScheme`
  - `item3_description`, `item3_name`, `item3_quantity`, `item3_unitCode`, `item3_unitPrice`, `item3_taxScheme`
- Much easier to fill out - just enter values in cells
- No JSON syntax required
- User-friendly column labels

## Features

### 1. **Multiple Line Items Support**
- Supports 1, 2, or 3 line items per invoice
- Users can leave unused item columns empty
- Only items with a description are included in the final invoice

### 2. **Backward Compatibility**
- The system still supports the old JSON format (`lineItems` column)
- Automatically detects which format is being used
- Old templates will continue to work

### 3. **Template Examples**
The generated template includes 3 example rows:
- **Row 1**: Single line item invoice
- **Row 2**: Two line items invoice  
- **Row 3**: Three line items invoice

This helps users understand how to fill out invoices with different numbers of items.

## Example Usage

### Old Format (Still Supported)
```json
lineItems: '[{"description":"Product 1","name":"Product 1","quantity":2,"unitCode":"piece","unitPrice":100,"taxScheme":"VAT"}]'
```

### New Format (Recommended)
| item1_description | item1_name | item1_quantity | item1_unitCode | item1_unitPrice | item1_taxScheme |
|-------------------|------------|----------------|----------------|-----------------|----------------|
| Premium Product A  | Product A  | 10             | piece         | 500             | VAT            |

| item2_description | item2_name | item2_quantity | item2_unitCode | item2_unitPrice | item2_taxScheme |
|-------------------|------------|----------------|----------------|-----------------|----------------|
| Standard Product B| Product B  | 5              | kg            | 150             | SP             |

## Technical Implementation

### Files Modified

1. **`src/lib/excel-utils.ts`**
   - Updated `generateInvoiceTemplate()` to create separate columns for line items
   - Updated `parseInvoiceExcel()` to handle both JSON and column-based formats
   - Added logic to parse `item{N}_{field}` column pattern
   - Supports up to 3 items per invoice

2. **`src/app/(dashboard)/invoices/bulk-upload/README.md`**
   - Updated documentation to explain the new column-based format
   - Added examples for 1, 2, and 3 line items
   - Kept information about legacy JSON format
   - Added troubleshooting tips specific to the new format

### How the Parser Works

1. **Detection**: When parsing an Excel file, the parser checks each column header
2. **JSON Format**: If a column named `lineItems` exists, it parses the JSON string
3. **Column Format**: If columns matching `item{N}_{field}` pattern exist (e.g., `item1_description`), it builds line items from those columns
4. **Item Extraction**: For each item number (1, 2, 3), it extracts all fields and creates a line item object
5. **Validation**: Only items with a description are included in the final array

### Code Snippet

```typescript
// Parse line items from column-based format
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
  if (item.description && item.description.toString().trim() !== '') {
    const parsedItem: any = {
      description: item.description?.toString() || '',
      name: item.name?.toString() || item.description?.toString() || '',
      quantity: parseFloat(item.quantity) || 0,
      unitCode: item.unitCode?.toString() || 'piece',
      unitPrice: parseFloat(item.unitPrice) || 0,
      taxScheme: item.taxScheme?.toString() || 'VAT'
    }
    lineItems.push(parsedItem)
  }
})
```

## Benefits

1. **User-Friendly**: No JSON syntax required
2. **Intuitive**: One column per field, like any normal Excel file
3. **Flexible**: Can use 1, 2, or 3 items per invoice
4. **Backward Compatible**: Old templates still work
5. **Error-Resistant**: No need to worry about JSON syntax errors
6. **Visual**: Easy to see all items at once in the spreadsheet

## User Instructions

### For Single Item Invoice
Fill in columns: `item1_description`, `item1_name`, `item1_quantity`, `item1_unitCode`, `item1_unitPrice`, `item1_taxScheme`

### For Two Items Invoice
Fill in all `item1_*` columns AND all `item2_*` columns

### For Three Items Invoice
Fill in all `item1_*`, `item2_*`, and `item3_*` columns

### Leave Unused Columns Empty
Don't worry about filling in item2 and item3 if you only have 1 item - just leave them empty!

## Testing

To test the enhancement:

1. Download the new template from the bulk upload page
2. Fill in an invoice with multiple line items using the new column format
3. Upload the file
4. Verify that all line items are correctly parsed and displayed

## Future Enhancements

Potential improvements:
- Add dropdown validation for unit codes (piece, kg, liter, etc.)
- Add dropdown validation for tax schemes (VAT, SP, PLT, AT)
- Support for more than 3 items per invoice (if needed)
- Excel data validation rules for better error prevention

