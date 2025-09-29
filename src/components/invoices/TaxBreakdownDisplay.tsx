'use client'

import {
  Stack,
  Group,
  Text,
  Paper,
  Badge,
  Divider,
  Title
} from '@mantine/core'
import { IconReceipt } from '@tabler/icons-react'
import { TaxTotal, formatCurrency, getTaxBreakdownSummary } from '../../utils/invoiceCalculations'

interface TaxBreakdownDisplayProps {
  taxTotal: TaxTotal
  currency: string
  title?: string
}

export default function TaxBreakdownDisplay({ 
  taxTotal, 
  currency, 
  title = "Tax Breakdown" 
}: TaxBreakdownDisplayProps) {
  const taxBreakdown = getTaxBreakdownSummary(taxTotal)

  if (taxBreakdown.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Group gap="xs" mb="sm">
          <IconReceipt size={16} />
          <Text fw={500} size="sm">{title}</Text>
        </Group>
        <Text size="sm" c="dimmed">No taxes applied</Text>
      </Paper>
    )
  }

  return (
    <Paper p="md" withBorder>
      <Stack gap="sm">
        <Group gap="xs">
          <IconReceipt size={16} />
          <Text fw={500} size="sm">{title}</Text>
          <Badge variant="light" color="blue" size="sm">
            {taxBreakdown.length} tax{taxBreakdown.length > 1 ? 'es' : ''}
          </Badge>
        </Group>

        <Stack gap="xs">
          {taxBreakdown.map((tax, index) => (
            <Group key={index} justify="space-between">
              <Group gap="xs">
                <Text size="sm" fw={500}>{tax.taxScheme}</Text>
                <Badge variant="outline" size="xs">
                  {tax.percent}%
                </Badge>
              </Group>
              <Stack gap={0} align="flex-end">
                <Text size="sm" fw={500}>
                  {formatCurrency(tax.taxAmount, currency)}
                </Text>
                <Text size="xs" c="dimmed">
                  on {formatCurrency(tax.taxableAmount, currency)}
                </Text>
              </Stack>
            </Group>
          ))}
        </Stack>

        <Divider />
        
        <Group justify="space-between">
          <Text fw={600}>Total Tax Amount:</Text>
          <Text fw={600} c="blue">
            {formatCurrency(taxTotal.taxAmount, currency)}
          </Text>
        </Group>
      </Stack>
    </Paper>
  )
}
