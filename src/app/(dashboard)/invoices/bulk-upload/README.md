# CamInvoice Bulk Upload Template

This page allows you to upload multiple invoices at once using an Excel file that follows the CamInvoice UBL structure requirements.

## Excel Template Structure

The Excel template includes all required fields for CamInvoice UBL compliance. The template has been designed to be **user-friendly** for non-technical users while supporting multiple line items per invoice.

### Required Fields

| Column | Description | Format | Example |
|--------|-------------|--------|---------|
| `invoiceNumber` | Unique invoice identifier | String | `INV-2024-001` |
| `customerId` | Customer ID from your system | String | `customer-001` |
| `issueDate` | Invoice issue date | YYYY-MM-DD | `2024-01-15` |
| `dueDate` | Payment due date (optional) | YYYY-MM-DD | `2024-02-15` |
| `currency` | Document currency code | KHR, USD, EUR, THB | `KHR` |
| `invoiceTypeCode` | Invoice type code | 380 (Standard) or 388 (Tax Invoice) | `388` |

### Supplier Party Information (Required for UBL)

| Column | Description | Format | Example |
|--------|-------------|--------|---------|
| `supplierEndpointId` | Supplier CamInvoice endpoint ID | String | `KHUID00001234` |
| `supplierName` | Supplier business name | String | `Your Company Ltd` |
| `supplierTaxId` | Supplier tax identification number | String | `123456789` |
| `supplierRegistrationNumber` | Supplier registration number | String | `REG-2024-001` |
| `supplierAddress` | Supplier business address | String | `123 Main Street, Phnom Penh` |
| `supplierCity` | Supplier city | String | `Phnom Penh` |
| `supplierCountry` | Supplier country code | String | `KH` |
| `supplierEmail` | Supplier email address | Email | `contact@yourcompany.com` |
| `supplierPhone` | Supplier phone number | String | `+855-23-123-456` |

### Customer Party Information (Required for UBL)

| Column | Description | Format | Example |
|--------|-------------|--------|---------|
| `customerEndpointId` | Customer CamInvoice endpoint ID | String | `KHUID00005678` |
| `customerName` | Customer business name | String | `Customer Company Ltd` |
| `customerTaxId` | Customer tax identification number | String | `987654321` |
| `customerRegistrationNumber` | Customer registration number | String | `CUST-2024-001` |
| `customerAddress` | Customer business address | String | `456 Business Ave, Phnom Penh` |
| `customerCity` | Customer city | String | `Phnom Penh` |
| `customerCountry` | Customer country code | String | `KH` |
| `customerEmail` | Customer email address | Email | `customer@example.com` |
| `customerPhone` | Customer phone number | String | `+855-23-987-654` |

### Optional Fields

| Column | Description | Format | Example |
|--------|-------------|--------|---------|
| `paymentTerms` | Payment terms description | String | `Net 30 days` |
| `notes` | Additional notes | String | `Thank you for your business` |
| `terms` | Terms and conditions | String | `Payment due within 30 days` |

### Line Items - User-Friendly Column Format

Instead of using JSON format, line items are now entered in **separate columns** for easy data entry. The template supports **up to 5 line items per invoice** by default (configurable).

For each line item, use these columns:

| Column Pattern | Description | Required | Example |
|----------------|-------------|----------|---------|
| `item1_description` | Item description | Yes | `Premium Product A` |
| `item1_name` | Item name | Yes | `Product A` |
| `item1_quantity` | Quantity | Yes | `10` |
| `item1_unitCode` | Unit of measurement | Yes | `piece`, `kg`, `liter`, etc. |
| `item1_unitPrice` | Price per unit | Yes | `500` |
| `item1_taxScheme` | Tax type | Yes | `VAT`, `SP`, `PLT`, `AT` |

Repeat the pattern for items 2, 3, 4, and 5:

- `item2_description`, `item2_name`, `item2_quantity`, etc.
- `item3_description`, `item3_name`, `item3_quantity`, etc.
- `item4_description`, `item4_name`, `item4_quantity`, etc.
- `item5_description`, `item5_name`, `item5_quantity`, etc.

**Example:**

- **Row with single item**: Fill in only `item1_*` columns
- **Row with two items**: Fill in `item1_*` and `item2_*` columns  
- **Row with three items**: Fill in `item1_*`, `item2_*`, and `item3_*` columns
- **Row with up to five items**: Fill in as many `itemN_*` columns as needed

**Note:** The template includes columns for up to 5 items, but you can use as few or as many as you need. Empty columns will be ignored.

## Line Item Fields Details

| Field | Description | Options |
|-------|-------------|---------|
| `description` | Detailed item description | Any text |
| `name` | Item name (short identifier) | Any text |
| `quantity` | Quantity to sell | Number > 0 |
| `unitCode` | Unit of measurement | `piece`, `kg`, `liter`, `hour`, `day`, `month`, `year`, `meter`, `sqm` |
| `unitPrice` | Price per unit | Number ≥ 0 |
| `taxScheme` | Tax type | `VAT` (10%), `SP` (10%), `PLT` (5%), `AT` (2%) |
| `allowanceReason` | Reason for allowance/discount (optional) | Any text - ChargeIndicator: false |
| `allowanceAmount` | Allowance amount to subtract (optional) | Number > 0 - ChargeIndicator: false |
| `chargeReason` | Reason for additional charge (optional) | Any text - ChargeIndicator: true |
| `chargeAmount` | Charge amount to add (optional) | Number > 0 - ChargeIndicator: true |

### Legacy JSON Format (Still Supported)

For advanced users, the system also supports the old JSON format with a single `lineItems` column. This format is automatically detected and processed.

**Example JSON:**

```json
[{"description":"Product 1","name":"Product 1","quantity":2,"unitCode":"piece","unitPrice":100,"taxScheme":"VAT"}]
```

#### Tax Schemes

- **VAT**: Value Added Tax (10%)
- **SP**: Specific Tax (10%)
- **PLT**: Public Lighting Tax (5%)
- **AT**: Accommodation Tax (2%)

## Invoice Type Codes

- **380**: Standard Invoice
- **388**: Tax Invoice (recommended for most business transactions)

## Currency Codes

- **KHR**: Cambodian Riel
- **USD**: US Dollar
- **EUR**: Euro
- **THB**: Thai Baht

## Example Template Usage

1. **Download the template** using the "Download Template" button
2. **Fill in your invoice data** following the examples provided
3. **For line items**, simply fill in the columns:
   - Fill `item1_*` columns for your first item
   - Fill `item2_*` columns for your second item (optional)
   - Fill `item3_*` columns for your third item (optional)
   - Leave unused item columns empty
4. **Save as Excel** (.xlsx) format
5. **Upload the file** using the drag-and-drop area

### Line Item Entry Tips

- **Single item invoice**: Only fill the `item1_*` columns
- **Multiple items**: Fill `item1_*`, `item2_*`, `item3_*`, `item4_*`, `item5_*` as needed
- **Empty item rows**: You can leave item columns empty (e.g., only fill item1 and item2, leave item3-5 empty)
- **Dynamic detection**: The system automatically detects which items are filled and ignores empty columns
- **Unit codes**: Use standard abbreviations like `piece`, `kg`, `liter`, `hour`, `day`, `month`, `year`, `meter`, `sqm`
- **Tax schemes**: Use `VAT` (10% tax), `SP` (10%), `PLT` (5%), or `AT` (2%)

## Validation

The system will validate:

- Required fields are present
- Customer IDs exist in your system
- Date formats are correct (YYYY-MM-DD)
- Currency codes are valid
- Invoice type codes are valid (380 or 388)
- Line items have all required fields
- Tax schemes are valid

## Tips

- **Get customer IDs**:
  - Go to the **Customers** page in the dashboard
  - Copy the exact customer ID from the customer record
  - Or use the customer ID when creating a new customer first
  - **Important**: The customer ID must already exist in your system before uploading the invoice
- **Use the examples** as a guide - they show 1, 2, and 3 item examples
- **Keep it simple**: Fill only the item columns you need (don't worry about empty ones)
- **Test with a small batch** first before uploading large files
- **Keep file size under 10MB** for optimal performance
- **Date format**: Always use YYYY-MM-DD (e.g., `2024-01-15`)
- **Quantities and prices**: Use numbers only (e.g., `10`, `150.50`)
- **Unit codes**: Choose from the standard list (piece, kg, liter, hour, day, month, year, meter, sqm)
- **Allowance/Charge**: 
  - Leave empty if not needed
  - If using allowance: Fill both `allowanceReason` and `allowanceAmount` (Amount must be > 0)
  - If using charge: Fill both `chargeReason` and `chargeAmount` (Amount must be > 0)
  - According to XML spec: Allowance = ChargeIndicator: false, Charge = ChargeIndicator: true

## Troubleshooting

- **"Invalid date format"**: Use YYYY-MM-DD format (e.g., `2024-01-15`)
- **"Invalid tax scheme"**: Use only `VAT`, `SP`, `PLT`, or `AT`
- **"Invalid unit code"**: Use standard units: `piece`, `kg`, `liter`, `hour`, `day`, `month`, `year`, `meter`, `sqm`
- **"Line item validation failed"**: Make sure all 6 fields (description, name, quantity, unitCode, unitPrice, taxScheme) are filled for each item
- **"No line items found"**: At least one item must have a description filled in
- **"Customer ID not found in database"**:
  - The customer ID you entered doesn't exist in your system
  - Go to the Customers page to see all available customer IDs
  - Make sure you copy the exact customer ID (not the customer name)
  - The customer must already exist before you can create an invoice for them
- **"Foreign key constraint error"**: This means the customer ID doesn't exist. Check that you're using the correct customer ID from your database
