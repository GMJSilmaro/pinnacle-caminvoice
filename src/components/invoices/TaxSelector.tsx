'use client'

import {
  Group,
  Checkbox,
  NumberInput,
  Text,
  Stack,
  Paper,
  Tooltip,
  Badge
} from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { InvoiceLineFormItem, TAX_SCHEMES, DEFAULT_TAX_RATES } from '../../types/invoice'

interface TaxSelectorProps {
  lineItem: InvoiceLineFormItem
  onChange: (updatedLineItem: InvoiceLineFormItem) => void
  disabled?: boolean
}

export default function TaxSelector({ lineItem, onChange, disabled = false }: TaxSelectorProps) {
  const handleTaxToggle = (taxType: keyof InvoiceLineFormItem['taxes'], enabled: boolean) => {
    const updatedLineItem = {
      ...lineItem,
      taxes: {
        ...lineItem.taxes,
        [taxType]: {
          ...lineItem.taxes[taxType],
          enabled
        }
      }
    }
    onChange(updatedLineItem)
  }

  const handleTaxPercentChange = (taxType: keyof InvoiceLineFormItem['taxes'], percent: number) => {
    const updatedLineItem = {
      ...lineItem,
      taxes: {
        ...lineItem.taxes,
        [taxType]: {
          ...lineItem.taxes[taxType],
          percent: percent || 0
        }
      }
    }
    onChange(updatedLineItem)
  }

  const calculateTaxAmount = (taxType: keyof InvoiceLineFormItem['taxes']): number => {
    const tax = lineItem.taxes[taxType]
    if (!tax.enabled) return 0
    return (lineItem.lineExtensionAmount * tax.percent) / 100
  }

  const getTotalTaxAmount = (): number => {
    return Object.keys(lineItem.taxes).reduce((total, taxType) => {
      return total + calculateTaxAmount(taxType as keyof InvoiceLineFormItem['taxes'])
    }, 0)
  }

  return (
    <Paper p="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Text fw={500} size="sm">Tax Configuration</Text>
          <Badge variant="light" color="blue">
            Total: ${getTotalTaxAmount().toFixed(2)}
          </Badge>
        </Group>

        {/* VAT */}
        <Group justify="space-between" align="center">
          <Group gap="xs" align="center">
            <Checkbox
              checked={lineItem.taxes.vat.enabled}
              onChange={(event) => handleTaxToggle('vat', event.currentTarget.checked)}
              disabled={disabled}
            />
            <Text size="sm" fw={500}>VAT</Text>
            <Tooltip label={TAX_SCHEMES.VAT.description}>
              <IconInfoCircle size={14} style={{ color: 'var(--mantine-color-gray-6)' }} />
            </Tooltip>
          </Group>
          <Group gap="xs" align="center">
            <NumberInput
              value={lineItem.taxes.vat.percent}
              onChange={(value) => handleTaxPercentChange('vat', value as number)}
              disabled={disabled || !lineItem.taxes.vat.enabled}
              min={0}
              max={100}
              decimalScale={2}
              suffix="%"
              w={80}
              size="xs"
            />
            {lineItem.taxes.vat.enabled && (
              <Text size="xs" c="dimmed" w={60} ta="right">
                ${calculateTaxAmount('vat').toFixed(2)}
              </Text>
            )}
          </Group>
        </Group>

        {/* Specific Tax */}
        <Group justify="space-between" align="center">
          <Group gap="xs" align="center">
            <Checkbox
              checked={lineItem.taxes.sp.enabled}
              onChange={(event) => handleTaxToggle('sp', event.currentTarget.checked)}
              disabled={disabled}
            />
            <Text size="sm" fw={500}>SP</Text>
            <Tooltip label={TAX_SCHEMES.SP.description}>
              <IconInfoCircle size={14} style={{ color: 'var(--mantine-color-gray-6)' }} />
            </Tooltip>
          </Group>
          <Group gap="xs" align="center">
            <NumberInput
              value={lineItem.taxes.sp.percent}
              onChange={(value) => handleTaxPercentChange('sp', value as number)}
              disabled={disabled || !lineItem.taxes.sp.enabled}
              min={0}
              max={100}
              decimalScale={2}
              suffix="%"
              w={80}
              size="xs"
            />
            {lineItem.taxes.sp.enabled && (
              <Text size="xs" c="dimmed" w={60} ta="right">
                ${calculateTaxAmount('sp').toFixed(2)}
              </Text>
            )}
          </Group>
        </Group>

        {/* Public Lighting Tax */}
        <Group justify="space-between" align="center">
          <Group gap="xs" align="center">
            <Checkbox
              checked={lineItem.taxes.plt.enabled}
              onChange={(event) => handleTaxToggle('plt', event.currentTarget.checked)}
              disabled={disabled}
            />
            <Text size="sm" fw={500}>PLT</Text>
            <Tooltip label={TAX_SCHEMES.PLT.description}>
              <IconInfoCircle size={14} style={{ color: 'var(--mantine-color-gray-6)' }} />
            </Tooltip>
          </Group>
          <Group gap="xs" align="center">
            <NumberInput
              value={lineItem.taxes.plt.percent}
              onChange={(value) => handleTaxPercentChange('plt', value as number)}
              disabled={disabled || !lineItem.taxes.plt.enabled}
              min={0}
              max={100}
              decimalScale={2}
              suffix="%"
              w={80}
              size="xs"
            />
            {lineItem.taxes.plt.enabled && (
              <Text size="xs" c="dimmed" w={60} ta="right">
                ${calculateTaxAmount('plt').toFixed(2)}
              </Text>
            )}
          </Group>
        </Group>

        {/* Accommodation Tax */}
        <Group justify="space-between" align="center">
          <Group gap="xs" align="center">
            <Checkbox
              checked={lineItem.taxes.at.enabled}
              onChange={(event) => handleTaxToggle('at', event.currentTarget.checked)}
              disabled={disabled}
            />
            <Text size="sm" fw={500}>AT</Text>
            <Tooltip label={TAX_SCHEMES.AT.description}>
              <IconInfoCircle size={14} style={{ color: 'var(--mantine-color-gray-6)' }} />
            </Tooltip>
          </Group>
          <Group gap="xs" align="center">
            <NumberInput
              value={lineItem.taxes.at.percent}
              onChange={(value) => handleTaxPercentChange('at', value as number)}
              disabled={disabled || !lineItem.taxes.at.enabled}
              min={0}
              max={100}
              decimalScale={2}
              suffix="%"
              w={80}
              size="xs"
            />
            {lineItem.taxes.at.enabled && (
              <Text size="xs" c="dimmed" w={60} ta="right">
                ${calculateTaxAmount('at').toFixed(2)}
              </Text>
            )}
          </Group>
        </Group>

        {/* Tax Summary */}
        {getTotalTaxAmount() > 0 && (
          <Group justify="space-between" pt="xs" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
            <Text size="sm" fw={600}>Total Tax Amount:</Text>
            <Text size="sm" fw={600} c="blue">
              ${getTotalTaxAmount().toFixed(2)}
            </Text>
          </Group>
        )}
      </Stack>
    </Paper>
  )
}
