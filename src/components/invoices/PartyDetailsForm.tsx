'use client'

import {
  Stack,
  TextInput,
  Grid,
  Title,
  Card,
  Group,
  Text,
  Badge,
  Alert
} from '@mantine/core'
import { IconBuilding, IconInfoCircle } from '@tabler/icons-react'
import { Party } from '../../types/invoice'

interface PartyDetailsFormProps {
  title: string
  party: Partial<Party>
  onChange: (party: Partial<Party>) => void
  readOnly?: boolean
  isSupplier?: boolean
}

export default function PartyDetailsForm({ 
  title, 
  party, 
  onChange, 
  readOnly = false,
  isSupplier = false 
}: PartyDetailsFormProps) {
  
  const handleChange = (field: string, value: string, nestedField?: string) => {
    if (nestedField) {
      onChange({
        ...party,
        [field]: {
          ...party[field as keyof Party],
          [nestedField]: value
        }
      })
    } else {
      onChange({
        ...party,
        [field]: value
      })
    }
  }

  return (
    <Card withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={4}>
            <Group gap="xs">
              <IconBuilding size={20} />
              {title}
            </Group>
          </Title>
          {isSupplier && (
            <Badge variant="light" color="blue">
              Auto-filled from tenant settings
            </Badge>
          )}
        </Group>

        {isSupplier && (
          <Alert color="blue" icon={<IconInfoCircle size={16} />}>
            <Text size="sm">
              Supplier details are automatically populated from your business profile. 
              You can update these in your account settings.
            </Text>
          </Alert>
        )}

        <Grid>
          {/* Endpoint ID */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Endpoint ID"
              placeholder="KHUID00001234"
              description="CamInv Endpoint ID for this party"
              value={party.endpointId || ''}
              onChange={(e) => handleChange('endpointId', e.target.value)}
              readOnly={readOnly}
              required
            />
          </Grid.Col>

          {/* Party Name */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Party Name"
              placeholder="Company Name"
              value={party.partyName || ''}
              onChange={(e) => handleChange('partyName', e.target.value)}
              readOnly={readOnly}
              required
            />
          </Grid.Col>
        </Grid>

        {/* Address Section */}
        <Title order={5} mt="md">Address Information</Title>
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Street Name"
              placeholder="Main Street"
              value={party.postalAddress?.streetName || ''}
              onChange={(e) => handleChange('postalAddress', e.target.value, 'streetName')}
              readOnly={readOnly}
              required
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Additional Street Name"
              placeholder="Additional address line"
              value={party.postalAddress?.additionalStreetName || ''}
              onChange={(e) => handleChange('postalAddress', e.target.value, 'additionalStreetName')}
              readOnly={readOnly}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              label="Building Name"
              placeholder="Building name"
              value={party.postalAddress?.buildingName || ''}
              onChange={(e) => handleChange('postalAddress', e.target.value, 'buildingName')}
              readOnly={readOnly}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              label="Floor"
              placeholder="Floor number"
              value={party.postalAddress?.floor || ''}
              onChange={(e) => handleChange('postalAddress', e.target.value, 'floor')}
              readOnly={readOnly}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              label="Room"
              placeholder="Room number"
              value={party.postalAddress?.room || ''}
              onChange={(e) => handleChange('postalAddress', e.target.value, 'room')}
              readOnly={readOnly}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="City Name"
              placeholder="Phnom Penh"
              value={party.postalAddress?.cityName || ''}
              onChange={(e) => handleChange('postalAddress', e.target.value, 'cityName')}
              readOnly={readOnly}
              required
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 3 }}>
            <TextInput
              label="Postal Zone"
              placeholder="12000"
              value={party.postalAddress?.postalZone || ''}
              onChange={(e) => handleChange('postalAddress', e.target.value, 'postalZone')}
              readOnly={readOnly}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 3 }}>
            <TextInput
              label="Country Code"
              placeholder="KH"
              value={party.postalAddress?.countryIdentificationCode || 'KH'}
              onChange={(e) => handleChange('postalAddress', e.target.value, 'countryIdentificationCode')}
              readOnly={readOnly}
              required
            />
          </Grid.Col>
        </Grid>

        {/* Tax Scheme Section */}
        <Title order={5} mt="md">Tax Information</Title>
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Company Tax ID"
              placeholder="K008-0000001"
              description="Tax identification number"
              value={party.partyTaxScheme?.companyId || ''}
              onChange={(e) => handleChange('partyTaxScheme', e.target.value, 'companyId')}
              readOnly={readOnly}
              required
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Tax Scheme"
              placeholder="VAT"
              value={party.partyTaxScheme?.taxScheme?.id || 'VAT'}
              onChange={(e) => handleChange('partyTaxScheme', e.target.value, 'taxScheme')}
              readOnly={readOnly}
              required
            />
          </Grid.Col>
        </Grid>

        {/* Legal Entity Section */}
        <Title order={5} mt="md">Legal Entity</Title>
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Registration Name"
              placeholder="Legal business name"
              value={party.partyLegalEntity?.registrationName || ''}
              onChange={(e) => handleChange('partyLegalEntity', e.target.value, 'registrationName')}
              readOnly={readOnly}
              required
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Company Registration ID"
              placeholder="0005000001"
              description="Business registration number"
              value={party.partyLegalEntity?.companyId || ''}
              onChange={(e) => handleChange('partyLegalEntity', e.target.value, 'companyId')}
              readOnly={readOnly}
              required
            />
          </Grid.Col>
        </Grid>

        {/* Contact Information */}
        <Title order={5} mt="md">Contact Information</Title>
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Telephone"
              placeholder="+855 12 345 678"
              value={party.contact?.telephone || ''}
              onChange={(e) => handleChange('contact', e.target.value, 'telephone')}
              readOnly={readOnly}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Email"
              placeholder="contact@company.com"
              type="email"
              value={party.contact?.electronicMail || ''}
              onChange={(e) => handleChange('contact', e.target.value, 'electronicMail')}
              readOnly={readOnly}
            />
          </Grid.Col>
        </Grid>
      </Stack>
    </Card>
  )
}
