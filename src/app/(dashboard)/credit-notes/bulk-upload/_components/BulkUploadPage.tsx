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
import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import PageLayout from '../../../../../components/layouts/PageLayout'
import { showNotification } from '../../../../../utils/notifications'
import { generateCreditNoteTemplate, parseCreditNoteExcel, validateCreditNoteData, calculateCreditNoteTotals, CURRENCY_CODES, TAX_OPTIONS } from '../../../../../lib/excel-utils'

// Types
interface ParsedCreditNote {
  id: string
  creditNoteNumber: string
  customerId: string
  customerName: string
  invoiceTypeCode: string
  originalInvoiceId: string
  originalInvoiceNumber: string
  originalInvoiceUuid: string
  issueDate: string
  currency: string
  reason: string
  description: string
  notes: string
  
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

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function BulkUploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<FileWithPath | null>(null)
  const [parsedCreditNotes, setParsedCreditNotes] = useState<ParsedCreditNote[]>([])
  const [customers, setCustomers] = useState<{ value: string; label: string }[]>([])
  const [invoices, setInvoices] = useState<{ value: string; label: string }[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState(0)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(10)
  const [successModalOpen, setSuccessModalOpen] = useState(false)

  // Load customers and invoices for validation
  useEffect(() => {
    const loadData = async () => {
      try {
        const [customersRes, invoicesRes] = await Promise.all([
          fetch('/api/customers?pageSize=100', { credentials: 'include' }),
          fetch('/api/invoices?pageSize=100', { credentials: 'include' })
        ])
        
        if (customersRes.ok) {
          const customersData = await customersRes.json()
          const customerOptions = (customersData.customers || []).map((c: any) => ({
            value: c.id,
            label: c.name
          }))
          setCustomers(customerOptions)
        }
        
        if (invoicesRes.ok) {
          const invoicesData = await invoicesRes.json()
          const invoiceOptions = (invoicesData.invoices || []).map((inv: any) => ({
            value: inv.id,
            label: inv.invoiceNumber
          }))
          setInvoices(invoiceOptions)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      }
    }
    loadData()
  }, [])

  const parseExcelFile = async (file: File) => {
    try {
      const rawCreditNotes = await parseCreditNoteExcel(file)
      
      const parsedCreditNotes: ParsedCreditNote[] = rawCreditNotes.map((creditNote, index) => {
        const lineItems = creditNote.lineItems || []
        const { subtotal, taxAmount, totalAmount } = calculateCreditNoteTotals(lineItems)

        let resolvedCustomerId: string = creditNote.customerId || ''
        let resolvedCustomer = customers.find(c => c.value === resolvedCustomerId)
        if (!resolvedCustomer && creditNote.customerName) {
          const name = String(creditNote.customerName).trim().toLowerCase()
          const byName = customers.find(c => c.label.trim().toLowerCase() === name)
          if (byName) {
            resolvedCustomerId = byName.value
            resolvedCustomer = byName
          }
        }

        const validation = validateCreditNoteData({ ...creditNote, customerId: resolvedCustomerId }, customers, invoices)

        return {
          id: `temp-${index}`,
          creditNoteNumber: creditNote.creditNoteNumber || '',
          customerId: resolvedCustomerId || '',
          customerName: resolvedCustomer?.label || creditNote.customerName || 'Unknown Customer',
          invoiceTypeCode: creditNote.invoiceTypeCode || '381', // Default to 381 if not provided
          originalInvoiceId: creditNote.originalInvoiceId || '',
          originalInvoiceNumber: creditNote.originalInvoiceNumber || '',
          originalInvoiceUuid: creditNote.originalInvoiceUuid || '',
          issueDate: creditNote.issueDate || '',
          currency: creditNote.currency || 'KHR',
          reason: creditNote.reason || '',
          description: creditNote.description || '',
          notes: creditNote.notes || '',
          
          // Supplier Party Information
          supplierEndpointId: creditNote.supplierEndpointId || '',
          supplierName: creditNote.supplierName || '',
          supplierTaxId: creditNote.supplierTaxId || '',
          supplierRegistrationNumber: creditNote.supplierRegistrationNumber || '',
          supplierAddress: creditNote.supplierAddress || '',
          supplierCity: creditNote.supplierCity || '',
          supplierCountry: creditNote.supplierCountry || 'KH',
          supplierEmail: creditNote.supplierEmail || '',
          supplierPhone: creditNote.supplierPhone || '',
          
          // Customer Party Information
          customerEndpointId: creditNote.customerEndpointId || '',
          customerTaxId: creditNote.customerTaxId || '',
          customerRegistrationNumber: creditNote.customerRegistrationNumber || '',
          customerAddress: creditNote.customerAddress || '',
          customerCity: creditNote.customerCity || '',
          customerCountry: creditNote.customerCountry || 'KH',
          customerEmail: creditNote.customerEmail || '',
          customerPhone: creditNote.customerPhone || '',
          
          lineItems: lineItems,
          subtotal,
          taxAmount,
          totalAmount,
          isValid: validation.isValid,
          errors: validation.errors
        }
      })

      setParsedCreditNotes(parsedCreditNotes)
      showNotification.success(`Parsed ${parsedCreditNotes.length} credit notes from Excel file`)
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
    
    parseExcelFile(uploadedFile).finally(() => {
      setIsProcessing(false)
    })
  }

  const downloadTemplate = () => {
    generateCreditNoteTemplate()
    showNotification.success('Template downloaded successfully')
  }

  const clearFile = () => {
    setFile(null)
    setParsedCreditNotes([])
  }

  const saveCreditNotes = async () => {
    const validCreditNotes = parsedCreditNotes.filter(cn => cn.isValid)
    
    if (validCreditNotes.length === 0) {
      showNotification.error('No valid credit notes to save')
      return
    }

    setIsSaving(true)
    setSaveProgress(0)

    try {
      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < validCreditNotes.length; i++) {
        const creditNote = validCreditNotes[i]
        
        try {
          let payloadCustomerId = creditNote.customerId
          if (!payloadCustomerId && creditNote.customerName) {
            const match = customers.find(c => c.label.trim().toLowerCase() === String(creditNote.customerName).trim().toLowerCase())
            if (match) payloadCustomerId = match.value
          }

          const customerExists = payloadCustomerId && customers.find(c => c.value === payloadCustomerId)
          if (!customerExists) {
            const errorMsg = `Customer not found for credit note ${creditNote.creditNoteNumber}. ID: ${payloadCustomerId || 'N/A'}, Name: ${creditNote.customerName || 'Unknown'}`
            errorCount++
            showNotification.error(errorMsg)
            continue
          }

          // Find original invoice ID by invoice number
          let originalInvoiceId: string | undefined
          if (creditNote.originalInvoiceNumber) {
            // Look up invoice by invoice number
            const invoiceMatch = invoices.find(inv => {
              const labelParts = inv.label.split(' - ')
              return labelParts[0] === creditNote.originalInvoiceNumber
            })
            if (invoiceMatch) {
              originalInvoiceId = invoiceMatch.value
            } else {
              // Try direct lookup by invoice number
              try {
                const invoiceRes = await fetch(`/api/invoices?search=${encodeURIComponent(creditNote.originalInvoiceNumber)}&pageSize=1`, { credentials: 'include' })
                if (invoiceRes.ok) {
                  const invoiceData = await invoiceRes.json()
                  if (invoiceData.invoices && invoiceData.invoices.length > 0) {
                    originalInvoiceId = invoiceData.invoices[0].id
                  }
                }
              } catch (e) {
                console.error('Failed to lookup invoice:', e)
              }
            }
          } else if (creditNote.originalInvoiceId) {
            // Fallback to direct ID if provided
            originalInvoiceId = creditNote.originalInvoiceId
          }

          // Determine document type and route to correct API
          const isCreditNote = creditNote.invoiceTypeCode === '381'
          const endpoint = isCreditNote ? '/api/credit-notes' : '/api/debit-notes'
          const lineItemsEndpoint = isCreditNote 
            ? `/api/credit-notes/{id}/line-items`
            : `/api/debit-notes/{id}/line-items`
          
          // Create credit note or debit note based on invoiceTypeCode
          const payload = isCreditNote ? {
            creditNoteNumber: creditNote.creditNoteNumber,
            issueDate: creditNote.issueDate,
            currency: creditNote.currency,
            customerId: payloadCustomerId,
            originalInvoiceId: originalInvoiceId || null,
            subtotal: creditNote.subtotal,
            taxAmount: creditNote.taxAmount,
            totalAmount: creditNote.totalAmount,
            reason: creditNote.reason || null,
            notes: creditNote.notes || null,
          } : {
            debitNoteNumber: creditNote.creditNoteNumber, // Use same field name for now
            issueDate: creditNote.issueDate,
            currency: creditNote.currency,
            customerId: payloadCustomerId,
            originalInvoiceId: originalInvoiceId || null,
            subtotal: creditNote.subtotal,
            taxAmount: creditNote.taxAmount,
            totalAmount: creditNote.totalAmount,
            reason: creditNote.reason || null,
            notes: creditNote.notes || null,
          }

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
          })

          if (res.ok) {
            const data = await res.json()
            const noteId = isCreditNote ? data.creditNote?.id : data.debitNote?.id

            // Add line items
            if (noteId && creditNote.lineItems.length > 0) {
              const lineItemsPayload = creditNote.lineItems.map(item => {
                const taxRate = item.taxScheme === 'VAT' ? 0.10 : 0
                const lineTotal = (item.quantity * item.unitPrice) - (item.allowanceAmount || 0) + (item.chargeAmount || 0)
                const taxAmount = lineTotal * taxRate
                return {
                  description: item.description || item.name,
                  quantity: Number(item.quantity),
                  unitPrice: Number(item.unitPrice),
                  taxRate: taxRate
                }
              })

              const actualLineItemsEndpoint = lineItemsEndpoint.replace('{id}', noteId)
              const lineItemsRes = await fetch(actualLineItemsEndpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lineItems: lineItemsPayload }),
                credentials: 'include'
              })

              if (!lineItemsRes.ok) {
                throw new Error('Failed to add line items')
              }
            }

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
            const docType = creditNote.invoiceTypeCode === '381' ? 'credit note' : 'debit note'
            showNotification.error(`Failed to save ${docType} ${creditNote.creditNoteNumber}: ${errorMessage}`)
          }
        } catch (error) {
          errorCount++
          const docType = creditNote.invoiceTypeCode === '381' ? 'credit note' : 'debit note'
          const errorMsg = error instanceof Error ? error.message : `Error saving ${docType} ${creditNote.creditNoteNumber}`
          showNotification.error(errorMsg)
        }

        setSaveProgress(((i + 1) / validCreditNotes.length) * 100)
      }

      // Count by type
      const creditCount = validCreditNotes.filter(cn => cn.invoiceTypeCode === '381').length
      const debitCount = validCreditNotes.filter(cn => cn.invoiceTypeCode === '383').length

      if (successCount > 0) {
        const message = []
        if (creditCount > 0) message.push(`${successCount} document${successCount !== 1 ? 's' : ''} saved`)
        showNotification.success(message.join(', '), 'Bulk Upload Successful', { link: '/credit-notes' })
      }
      
      if (errorCount > 0) {
        showNotification.error(`Failed to save ${errorCount} document${errorCount !== 1 ? 's' : ''}. Check console for details.`, 'Bulk Upload Errors')
      }

      if (successCount === validCreditNotes.length && successCount > 0) {
        setFile(null)
        setParsedCreditNotes([])
        setCurrentPage(1)
        setSuccessModalOpen(true)
      } else if (errorCount > 0) {
        showNotification.warning(`${errorCount} document${errorCount !== 1 ? 's' : ''} failed to save. ${successCount > 0 ? `${successCount} were saved successfully.` : 'Please fix the errors and try again.'}`, 'Some Uploads Failed')
      }
    } catch (error) {
      console.error('Error saving documents:', error)
      showNotification.error('Failed to save documents')
    } finally {
      setIsSaving(false)
      setSaveProgress(0)
    }
  }

  const validCount = parsedCreditNotes.filter(cn => cn.isValid).length
  const invalidCount = parsedCreditNotes.length - validCount

  const effectivePageSize = itemsPerPage <= 0 ? parsedCreditNotes.length || 1 : itemsPerPage
  const totalPages = Math.max(1, Math.ceil(parsedCreditNotes.length / effectivePageSize))
  const startIndex = (currentPage - 1) * effectivePageSize
  const endIndex = startIndex + effectivePageSize
  const currentCreditNotes = parsedCreditNotes.slice(startIndex, endIndex)

  const toggleRow = (creditNoteId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(creditNoteId)) {
        newSet.delete(creditNoteId)
      } else {
        newSet.add(creditNoteId)
      }
      return newSet
    })
  }

  return (
    <>
    <PageLayout
      title="Bulk Upload Credit/Debit Notes"
      subtitle="Upload multiple credit notes and debit notes at once using Excel files. Use invoiceTypeCode (381=CN, 383=DN) to identify document type."
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
        {parsedCreditNotes.length > 0 && (
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
                    Some credit notes have validation errors. Only valid credit notes will be saved.
                  </Text>
                </Alert>
              )}

              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: '40px' }}></Table.Th>
                    <Table.Th style={{ width: '50px' }}>#</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Note #</Table.Th>
                    <Table.Th>Original Invoice</Table.Th>
                    <Table.Th>Customer</Table.Th>
                    <Table.Th>Issue Date</Table.Th>
                    <Table.Th>Currency</Table.Th>
                    <Table.Th>Total</Table.Th>
                    <Table.Th>Errors</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {currentCreditNotes.map((creditNote, rowIndex) => {
                    const globalIndex = startIndex + rowIndex + 1
                    const isExpanded = expandedRows.has(creditNote.id)
                    return (
                      <Fragment key={creditNote.id}>
                        <Table.Tr>
                          <Table.Td>
                            <ActionIcon
                              variant="subtle"
                              onClick={() => toggleRow(creditNote.id)}
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
                              color={creditNote.isValid ? 'green' : 'red'}
                              variant="light"
                              leftSection={creditNote.isValid ? <IconCheck size={12} /> : <IconX size={12} />}
                            >
                              {creditNote.isValid ? 'Valid' : 'Invalid'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge 
                              color={creditNote.invoiceTypeCode === '381' ? 'blue' : creditNote.invoiceTypeCode === '383' ? 'orange' : 'gray'}
                              variant="light"
                              title={`Invoice Type Code: ${creditNote.invoiceTypeCode}`}
                            >
                              {creditNote.invoiceTypeCode === '381' ? 'Credit Note' : creditNote.invoiceTypeCode === '383' ? 'Debit Note' : creditNote.invoiceTypeCode || 'N/A'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={500}>{creditNote.creditNoteNumber}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={2}>
                              <Text size="sm">{creditNote.originalInvoiceNumber || creditNote.originalInvoiceId || '-'}</Text>
                              {creditNote.originalInvoiceUuid && (
                                <Text size="xs" c="dimmed" truncate>UUID: {creditNote.originalInvoiceUuid}</Text>
                              )}
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={2}>
                              <Text size="sm" fw={500}>{creditNote.customerName}</Text>
                              <Text size="xs" c="dimmed">ID: {creditNote.customerEndpointId || 'N/A'}</Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>{creditNote.issueDate}</Table.Td>
                          <Table.Td>{creditNote.currency}</Table.Td>
                          <Table.Td>{creditNote.currency} {creditNote.totalAmount.toFixed(2)}</Table.Td>
                          <Table.Td>
                            {creditNote.errors.length > 0 ? (
                              <Tooltip label={creditNote.errors.join(', ')}>
                                <Text size="sm" c="red">
                                  {creditNote.errors.length} error{creditNote.errors.length > 1 ? 's' : ''}
                                </Text>
                              </Tooltip>
                            ) : (
                              <Text size="sm" c="dimmed">-</Text>
                            )}
                          </Table.Td>
                        </Table.Tr>
                        {isExpanded && (
                          <Table.Tr>
                            <Table.Td colSpan={11}>
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
                                        {creditNote.lineItems.map((item, index) => {
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
                                              <Table.Td>{creditNote.currency} {item.unitPrice.toFixed(2)}</Table.Td>
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
                                                      {creditNote.currency} {item.allowanceAmount.toFixed(2)}
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
                                                      {creditNote.currency} {item.chargeAmount.toFixed(2)}
                                                    </Text>
                                                  </Stack>
                                                ) : (
                                                  <Text size="sm" c="dimmed">-</Text>
                                                )}
                                              </Table.Td>
                                              <Table.Td>
                                                <Text fw={500}>
                                                  {creditNote.currency} {totalWithTax.toFixed(2)}
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
                    Showing {parsedCreditNotes.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, parsedCreditNotes.length)} of {parsedCreditNotes.length} document{parsedCreditNotes.length !== 1 ? 's' : ''}
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
                  <Text size="sm" mb="xs">Saving documents...</Text>
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
                  onClick={saveCreditNotes}
                  loading={isSaving}
                  disabled={validCount === 0}
                >
                  Save {validCount} Valid Document{validCount !== 1 ? 's' : ''}
                </Button>
              </Group>
            </Stack>
          </Card>
        )}
      </Stack>
    </PageLayout>

    <Modal opened={successModalOpen} onClose={() => setSuccessModalOpen(false)} title="Documents saved">
      <Stack>
        <Text size="sm">Your documents were saved as drafts and are ready to submit to CamInvoice.</Text>
        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={() => setSuccessModalOpen(false)}>Stay</Button>
          <Button onClick={() => router.push('/credit-notes')}>Go to Credit/Debit Notes</Button>
        </Group>
      </Stack>
    </Modal>
  </>
  )
}

