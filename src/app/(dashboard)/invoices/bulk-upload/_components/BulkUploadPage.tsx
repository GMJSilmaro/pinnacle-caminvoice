'use client'

import {
  Title,
  Text,
  Stack,
  Card,
  Group,
  Button,
  Table,
  Badge,
  Alert,
  Progress,
  ActionIcon,
  Tooltip,
  Paper,
  Box,
  Divider,
  Collapse,
  Pagination,
  Select,
  Modal,
} from '@mantine/core'
import {
  IconUpload,
  IconDownload,
  IconFileSpreadsheet,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconTrash,
  IconRefresh,
  IconChevronDown,
  IconChevronRight,
} from '@tabler/icons-react'
import { Dropzone, FileWithPath } from '@mantine/dropzone'
import { useForm } from '@mantine/form'
import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import PageLayout from '../../../../../components/layouts/PageLayout'
import { showNotification } from '../../../../../utils/notifications'
import { generateInvoiceTemplate, parseInvoiceExcel, validateInvoiceData, calculateInvoiceTotals, CURRENCY_CODES, TAX_OPTIONS } from '../../../../../lib/excel-utils'

// Types
interface ParsedInvoice {
  id: string
  invoiceNumber: string
  customerId: string
  customerName: string
  issueDate: string
  dueDate: string
  currency: string
  invoiceTypeCode: string
  
  // Supplier Party Information
  supplierEndpointId: string
  supplierName: string
  supplierTaxId: string
  supplierRegistrationNumber: string
  supplierAddress: string
  supplierCity: string
  supplierCountry: string
  supplierEmail: string
  supplierPhone: string
  
  // Customer Party Information
  customerEndpointId: string
  customerTaxId: string
  customerRegistrationNumber: string
  customerAddress: string
  customerCity: string
  customerCountry: string
  customerEmail: string
  customerPhone: string
  
  // Additional Fields
  paymentTerms: string
  notes: string
  terms: string
  lineItems: LineItem[]
  subtotal: number
  taxAmount: number
  totalAmount: number
  isValid: boolean
  errors: string[]
}

interface LineItem {
  description: string
  name: string
  quantity: number
  unitPrice: number
  unitCode: string
  taxScheme: string
  allowanceReason?: string
  allowanceAmount?: number
  chargeReason?: string
  chargeAmount?: number
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function BulkUploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<FileWithPath | null>(null)
  const [parsedInvoices, setParsedInvoices] = useState<ParsedInvoice[]>([])
  const [customers, setCustomers] = useState<{ value: string; label: string }[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState(0)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(10)
  const [successModalOpen, setSuccessModalOpen] = useState(false)

  // Load customers for validation
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const res = await fetch('/api/customers?pageSize=100', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const customerOptions = (data.customers || []).map((c: any) => ({
            value: c.id,
            label: c.name
          }))
          setCustomers(customerOptions)
        }
      } catch (error) {
        console.error('Failed to load customers:', error)
      }
    }
    loadCustomers()
  }, [])


  const parseExcelFile = async (file: File) => {
    try {
      const rawInvoices = await parseInvoiceExcel(file)
      
      const parsedInvoices: ParsedInvoice[] = rawInvoices.map((invoice, index) => {
        const lineItems = invoice.lineItems || []
        const { subtotal, taxAmount, totalAmount } = calculateInvoiceTotals(lineItems)

        // Resolve customerId dynamically when missing by matching the provided customerName
        let resolvedCustomerId: string = invoice.customerId || ''
        let resolvedCustomer = customers.find(c => c.value === resolvedCustomerId)
        if (!resolvedCustomer && invoice.customerName) {
          const name = String(invoice.customerName).trim().toLowerCase()
          const byName = customers.find(c => c.label.trim().toLowerCase() === name)
          if (byName) {
            resolvedCustomerId = byName.value
            resolvedCustomer = byName
          }
        }

        const validation = validateInvoiceData({ ...invoice, customerId: resolvedCustomerId }, customers)

        return {
          id: `temp-${index}`,
          invoiceNumber: invoice.invoiceNumber || '',
          customerId: resolvedCustomerId || '',
          customerName: resolvedCustomer?.label || invoice.customerName || 'Unknown Customer',
          issueDate: invoice.issueDate || '',
          dueDate: invoice.dueDate || '',
          currency: invoice.currency || 'KHR',
          invoiceTypeCode: invoice.invoiceTypeCode || '388',
          
          // Supplier Party Information
          supplierEndpointId: invoice.supplierEndpointId || '',
          supplierName: invoice.supplierName || '',
          supplierTaxId: invoice.supplierTaxId || '',
          supplierRegistrationNumber: invoice.supplierRegistrationNumber || '',
          supplierAddress: invoice.supplierAddress || '',
          supplierCity: invoice.supplierCity || '',
          supplierCountry: invoice.supplierCountry || 'KH',
          supplierEmail: invoice.supplierEmail || '',
          supplierPhone: invoice.supplierPhone || '',
          
          // Customer Party Information
          customerEndpointId: invoice.customerEndpointId || '',
          customerTaxId: invoice.customerTaxId || '',
          customerRegistrationNumber: invoice.customerRegistrationNumber || '',
          customerAddress: invoice.customerAddress || '',
          customerCity: invoice.customerCity || '',
          customerCountry: invoice.customerCountry || 'KH',
          customerEmail: invoice.customerEmail || '',
          customerPhone: invoice.customerPhone || '',
          
          // Additional Fields
          paymentTerms: invoice.paymentTerms || '',
          notes: invoice.notes || '',
          terms: invoice.terms || '',
          lineItems: lineItems,
          subtotal,
          taxAmount,
          totalAmount,
          isValid: validation.isValid,
          errors: validation.errors
        }
      })

      setParsedInvoices(parsedInvoices)
      showNotification.success(`Parsed ${parsedInvoices.length} invoices from Excel file`)
    } catch (error) {
      console.error('Error parsing Excel file:', error)
      showNotification.error(error instanceof Error ? error.message : 'Failed to parse Excel file. Please check the format.')
    }
  }

  const handleFileUpload = (files: FileWithPath[]) => {
    const uploadedFile = files[0]
    if (!uploadedFile) return

    if (uploadedFile.size > MAX_FILE_SIZE) {
      showNotification.error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`)
      return
    }

    const validExtensions = ['.xlsx', '.xls']
    const fileExtension = uploadedFile.name.toLowerCase().substring(uploadedFile.name.lastIndexOf('.'))
    
    if (!validExtensions.includes(fileExtension)) {
      showNotification.error('Invalid file type. Please upload an Excel file (.xlsx or .xls)')
      return
    }

    setFile(uploadedFile)
    setIsProcessing(true)
    
    // Process the file
    parseExcelFile(uploadedFile).finally(() => {
      setIsProcessing(false)
    })
  }

  const downloadTemplate = () => {
    generateInvoiceTemplate()
    showNotification.success('Template downloaded successfully')
  }

  const clearFile = () => {
    setFile(null)
    setParsedInvoices([])
  }

  const saveInvoices = async () => {
    const validInvoices = parsedInvoices.filter(invoice => invoice.isValid)
    
    if (validInvoices.length === 0) {
      showNotification.error('No valid invoices to save')
      return
    }

    setIsSaving(true)
    setSaveProgress(0)

    try {
      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < validInvoices.length; i++) {
        const invoice = validInvoices[i]
        
        try {
          // Resolve customerId (prefer provided, else match by name)
          let payloadCustomerId = invoice.customerId
          if (!payloadCustomerId && invoice.customerName) {
            const match = customers.find(c => c.label.trim().toLowerCase() === String(invoice.customerName).trim().toLowerCase())
            if (match) payloadCustomerId = match.value
          }

          // Validate that customer exists in database
          const customerExists = payloadCustomerId && customers.find(c => c.value === payloadCustomerId)
          if (!customerExists) {
            const missingIdText = payloadCustomerId ? `"${payloadCustomerId}"` : 'N/A'
            const errorMsg = `Customer not found for invoice ${invoice.invoiceNumber}. ID: ${missingIdText}, Name: ${invoice.customerName || 'Unknown'}`
            errorCount++
            showNotification.error(errorMsg)
            console.error(errorMsg)
            continue // Skip this invoice and move to next one
          }

          const payload = {
            invoiceNumber: invoice.invoiceNumber,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate || null,
            currency: invoice.currency,
            customerId: payloadCustomerId,
            paymentTerms: invoice.paymentTerms || null,
            lineItems: invoice.lineItems.map(item => ({
              description: item.description || item.name, // Use name as fallback
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              taxScheme: item.taxScheme || 'VAT',
              allowanceAmount: item.allowanceAmount ? Number(item.allowanceAmount) : undefined,
              chargeAmount: item.chargeAmount ? Number(item.chargeAmount) : undefined
            }))
          }

          const res = await fetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
          })

          if (res.ok) {
            successCount++
          } else {
            errorCount++
            let errorMessage = 'Unknown error'
            try {
              const error = await res.json()
              errorMessage = error.error || JSON.stringify(error)
            } catch (e) {
              errorMessage = `HTTP ${res.status}: ${res.statusText}`
            }
            if (res.status === 409 || errorMessage.includes('DUPLICATE_INVOICE_NUMBER')) {
              showNotification.warning(`Duplicate invoice number: ${invoice.invoiceNumber}. Skipped.`)
            } else {
              showNotification.error(`Failed to save invoice ${invoice.invoiceNumber}: ${errorMessage}`)
            }
            console.error(`Failed to save invoice ${invoice.invoiceNumber}:`, errorMessage)
          }
        } catch (error) {
          errorCount++
          const errorMsg = error instanceof Error ? error.message : `Error saving invoice ${invoice.invoiceNumber}`
          showNotification.error(errorMsg)
          console.error(`Error saving invoice ${invoice.invoiceNumber}:`, error)
        }

        setSaveProgress(((i + 1) / validInvoices.length) * 100)
      }

      // Show detailed feedback
      if (successCount > 0) {
        showNotification.success(`Successfully saved ${successCount} invoice${successCount !== 1 ? 's' : ''}`, 'Bulk Upload Successful', { link: '/invoices' })
      }
      
      if (errorCount > 0) {
        showNotification.error(`Failed to save ${errorCount} invoice${errorCount !== 1 ? 's' : ''}. Check console for details.`, 'Bulk Upload Errors')
      }

      // Only redirect if ALL invoices were successfully saved
      if (successCount === validInvoices.length && successCount > 0) {
        // Clear state and show follow-up modal
        setFile(null)
        setParsedInvoices([])
        setCurrentPage(1)
        setSuccessModalOpen(true)
      } else if (errorCount > 0) {
        // Keep the current state so user can review and fix errors
        showNotification.warning(`${errorCount} invoice${errorCount !== 1 ? 's' : ''} failed to save. ${successCount > 0 ? `${successCount} were saved successfully.` : 'Please fix the errors and try again.'}`, 'Some Uploads Failed')
      }
    } catch (error) {
      console.error('Error saving invoices:', error)
      showNotification.error('Failed to save invoices')
    } finally {
      setIsSaving(false)
      setSaveProgress(0)
    }
  }

  const validCount = parsedInvoices.filter(invoice => invoice.isValid).length
  const invalidCount = parsedInvoices.length - validCount

  // Calculate pagination (0 or Infinity shows all)
  const effectivePageSize = itemsPerPage <= 0 ? parsedInvoices.length || 1 : itemsPerPage
  const totalPages = Math.max(1, Math.ceil(parsedInvoices.length / effectivePageSize))
  const startIndex = (currentPage - 1) * effectivePageSize
  const endIndex = startIndex + effectivePageSize
  const currentInvoices = parsedInvoices.slice(startIndex, endIndex)

  const toggleRow = (invoiceId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId)
      } else {
        newSet.add(invoiceId)
      }
      return newSet
    })
  }


  return (
    <>
    <PageLayout
      title="Bulk Upload Invoices"
      subtitle="Upload multiple invoices at once using Excel files"
      showBackButton={true}
      actions={
        <Group>
          <Button
            leftSection={<IconDownload size={16} />}
            variant="light"
            onClick={downloadTemplate}
          >
            Download Template
          </Button>
          {file && (
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="outline"
              onClick={clearFile}
            >
              Clear
            </Button>
          )}
        </Group>
      }
    >
      <Stack gap="lg">
        {/* Upload Section */}
        <Card withBorder>
          <Stack gap="md">
            <Title order={3}>Upload Excel File</Title>
            
            {!file ? (
              <Dropzone
                onDrop={handleFileUpload}
                onReject={(files) => {
                  const error = files[0]?.errors[0]
                  showNotification.error(error?.message || 'File upload rejected')
                }}
                accept={{
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                  'application/vnd.ms-excel': ['.xls']
                }}
                maxFiles={1}
                maxSize={MAX_FILE_SIZE}
                loading={isProcessing}
              >
                <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: 'none' }}>
                  <div>
                    <IconFileSpreadsheet size={52} style={{ color: 'var(--mantine-color-blue-6)' }} />
                  </div>
                  <div>
                    <Text size="xl" inline>
                      Drag Excel file here or click to select
                    </Text>
                    <Text size="sm" c="dimmed" inline mt={7}>
                      Supports .xlsx and .xls files up to 10MB
                    </Text>
                  </div>
                </Group>
              </Dropzone>
            ) : (
              <Paper p="md" withBorder>
                <Group justify="space-between">
                  <Group>
                    <IconFileSpreadsheet size={24} />
                    <div>
                      <Text fw={500}>{file.name}</Text>
                      <Text size="sm" c="dimmed">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    </div>
                  </Group>
                  <ActionIcon color="red" variant="subtle" onClick={clearFile}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Paper>
            )}

            {isProcessing && (
              <Box>
                <Text size="sm" mb="xs">Processing Excel file...</Text>
                <Progress value={100} animated />
              </Box>
            )}
          </Stack>
        </Card>

        {/* Preview Section */}
        {parsedInvoices.length > 0 && (
          <Card withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={3}>Preview & Validation</Title>
                <Group>
                  <Badge color="green" variant="light">
                    {validCount} Valid
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge color="red" variant="light">
                      {invalidCount} Invalid
                    </Badge>
                  )}
                </Group>
              </Group>

              {invalidCount > 0 && (
                <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
                  <Text size="sm">
                    Some invoices have validation errors. Only valid invoices will be saved.
                  </Text>
                </Alert>
              )}

              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: '40px' }}></Table.Th>
                    <Table.Th style={{ width: '50px' }}>#</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Invoice #</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Supplier</Table.Th>
                    <Table.Th>Customer</Table.Th>
                    <Table.Th>Issue Date</Table.Th>
                    <Table.Th>Currency</Table.Th>
                    <Table.Th>Total</Table.Th>
                    <Table.Th>Errors</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {currentInvoices.map((invoice, rowIndex) => {
                    const globalIndex = startIndex + rowIndex + 1
                    const isExpanded = expandedRows.has(invoice.id)
                    return (
                      <Fragment key={invoice.id}>
                        <Table.Tr>
                          <Table.Td>
                            <ActionIcon
                              variant="subtle"
                              onClick={() => toggleRow(invoice.id)}
                            >
                              {isExpanded ? (
                                <IconChevronDown size={16} />
                              ) : (
                                <IconChevronRight size={16} />
                              )}
                            </ActionIcon>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed" fw={500}>
                              {globalIndex}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              color={invoice.isValid ? 'green' : 'red'}
                              variant="light"
                              leftSection={invoice.isValid ? <IconCheck size={12} /> : <IconX size={12} />}
                            >
                              {invoice.isValid ? 'Valid' : 'Invalid'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>{invoice.invoiceNumber}</Table.Td>
                          <Table.Td>
                            <Badge variant="light" size="sm">
                              {invoice.invoiceTypeCode === '388' ? 'Tax Invoice' : 'Standard'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={2}>
                              <Text size="sm" fw={500}>{invoice.supplierName}</Text>
                              <Text size="xs" c="dimmed">ID: {invoice.supplierEndpointId}</Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={2}>
                              <Text size="sm" fw={500}>{invoice.customerName}</Text>
                              <Text size="xs" c="dimmed">ID: {invoice.customerEndpointId || 'N/A'}</Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>{invoice.issueDate}</Table.Td>
                          <Table.Td>{invoice.currency}</Table.Td>
                          <Table.Td>{invoice.currency} {invoice.totalAmount.toFixed(2)}</Table.Td>
                          <Table.Td>
                            {invoice.errors.length > 0 ? (
                              <Tooltip label={invoice.errors.join(', ')}>
                                <Text size="sm" c="red">
                                  {invoice.errors.length} error{invoice.errors.length > 1 ? 's' : ''}
                                </Text>
                              </Tooltip>
                            ) : (
                              <Text size="sm" c="dimmed">-</Text>
                            )}
                          </Table.Td>
                        </Table.Tr>
                        {isExpanded && (
                          <Table.Tr>
                            <Table.Td colSpan={13}>
                              <Collapse in={isExpanded}>
                                <Box p="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                                  <Stack gap="sm">
                                    <Title order={5}>Line Items</Title>
                                    <Table striped>
                                      <Table.Thead>
                                        <Table.Tr>
                                          <Table.Th style={{ width: '50px' }}>#</Table.Th>
                                          <Table.Th>Description</Table.Th>
                                          <Table.Th>Name</Table.Th>
                                          <Table.Th>Quantity</Table.Th>
                                          <Table.Th>Unit</Table.Th>
                                          <Table.Th>Unit Price</Table.Th>
                                          <Table.Th>Tax Scheme</Table.Th>
                                          <Table.Th>Allowance</Table.Th>
                                          <Table.Th>Charge</Table.Th>
                                          <Table.Th>Total</Table.Th>
                                        </Table.Tr>
                                      </Table.Thead>
                                      <Table.Tbody>
                                        {invoice.lineItems.map((item, index) => {
                                          const itemTotal = item.quantity * item.unitPrice
                                          const allowanceAmount = item.allowanceAmount || 0
                                          const chargeAmount = item.chargeAmount || 0
                                          const subtotal = itemTotal - allowanceAmount + chargeAmount
                                          const taxAmount = item.taxScheme === 'VAT' ? subtotal * 0.1 : 0
                                          const totalWithTax = subtotal + taxAmount
                                          return (
                                            <Table.Tr key={index}>
                                              <Table.Td>
                                                <Text size="sm" c="dimmed" fw={500}>
                                                  {index + 1}
                                                </Text>
                                              </Table.Td>
                                              <Table.Td>{item.description}</Table.Td>
                                              <Table.Td>{item.name}</Table.Td>
                                              <Table.Td>{item.quantity}</Table.Td>
                                              <Table.Td>
                                                <Badge variant="outline" size="sm">{item.unitCode}</Badge>
                                              </Table.Td>
                                              <Table.Td>{invoice.currency} {item.unitPrice.toFixed(2)}</Table.Td>
                                              <Table.Td>
                                                <Badge size="sm" color={item.taxScheme === 'VAT' ? 'blue' : 'orange'}>
                                                  {item.taxScheme}
                                                </Badge>
                                              </Table.Td>
                                              <Table.Td>
                                                {item.allowanceAmount && item.allowanceAmount > 0 ? (
                                                  <Stack gap={4}>
                                                    <Badge size="sm" color="green" variant="light" title="ChargeIndicator: false">
                                                      false
                                                    </Badge>
                                                    <Text size="xs" c="dimmed" truncate>
                                                      {item.allowanceReason || 'No reason'}
                                                    </Text>
                                                    <Text size="xs" fw={500} c="green">
                                                      {invoice.currency} {item.allowanceAmount.toFixed(2)}
                                                    </Text>
                                                  </Stack>
                                                ) : (
                                                  <Text size="sm" c="dimmed">-</Text>
                                                )}
                                              </Table.Td>
                                              <Table.Td>
                                                {item.chargeAmount && item.chargeAmount > 0 ? (
                                                  <Stack gap={4}>
                                                    <Badge size="sm" color="red" variant="light" title="ChargeIndicator: true">
                                                      true
                                                    </Badge>
                                                    <Text size="xs" c="dimmed" truncate>
                                                      {item.chargeReason || 'No reason'}
                                                    </Text>
                                                    <Text size="xs" fw={500} c="red">
                                                      {invoice.currency} {item.chargeAmount.toFixed(2)}
                                                    </Text>
                                                  </Stack>
                                                ) : (
                                                  <Text size="sm" c="dimmed">-</Text>
                                                )}
                                              </Table.Td>
                                              <Table.Td>
                                                <Text fw={500}>
                                                  {invoice.currency} {totalWithTax.toFixed(2)}
                                                </Text>
                                              </Table.Td>
                                            </Table.Tr>
                                          )
                                        })}
                                      </Table.Tbody>
                                    </Table>
                                  </Stack>
                                </Box>
                              </Collapse>
                            </Table.Td>
                          </Table.Tr>
                        )}
                      </Fragment>
                    )
                  })}
                </Table.Tbody>
              </Table>

              {/* Page size + Pagination */}
              <Group justify="space-between" mt="md">
                <Group gap="sm">
                  <Text size="sm" c="dimmed">
                    Showing {parsedInvoices.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, parsedInvoices.length)} of {parsedInvoices.length} invoices
                  </Text>
                  <Select
                    size="xs"
                    label={undefined}
                    aria-label="Rows per page"
                    data={[
                      { value: '10', label: '10 / page' },
                      { value: '25', label: '25 / page' },
                      { value: '50', label: '50 / page' },
                      { value: '100', label: '100 / page' },
                      { value: '0', label: 'All' },
                    ]}
                    value={String(itemsPerPage)}
                    onChange={(v) => {
                      const next = Number(v || '10')
                      setItemsPerPage(next)
                      setCurrentPage(1)
                    }}
                    w={140}
                  />
                </Group>
                <Pagination
                  total={totalPages}
                  value={currentPage}
                  onChange={setCurrentPage}
                  size="sm"
                />
              </Group>

              {isSaving && (
                <Box>
                  <Text size="sm" mb="xs">Saving invoices...</Text>
                  <Progress value={saveProgress} />
                </Box>
              )}

              <Group justify="flex-end">
                <Button
                  variant="outline"
                  onClick={clearFile}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  leftSection={<IconUpload size={16} />}
                  onClick={saveInvoices}
                  loading={isSaving}
                  disabled={validCount === 0}
                >
                  Save {validCount} Valid Invoice{validCount !== 1 ? 's' : ''}
                </Button>
              </Group>
            </Stack>
          </Card>
        )}
      </Stack>
    </PageLayout>

    <Modal opened={successModalOpen} onClose={() => setSuccessModalOpen(false)} title="Invoices saved">
      <Stack>
        <Text size="sm">Your invoices were saved as drafts and are ready to submit to CamInvoice.</Text>
        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={() => setSuccessModalOpen(false)}>Stay</Button>
          <Button onClick={() => router.push('/invoices')}>Go to Invoices</Button>
        </Group>
      </Stack>
    </Modal>
  </>
  )
}
