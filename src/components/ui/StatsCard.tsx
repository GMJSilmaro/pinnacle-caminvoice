'use client'

import { Card, Group, Text, ThemeIcon, Stack, ActionIcon } from '@mantine/core'
import { IconTrendingUp, IconTrendingDown, IconPlus } from '@tabler/icons-react'
import { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: string
    type: 'up' | 'down'
    color?: string
  }
  icon?: ReactNode
  iconColor?: string
  iconBg?: string
  action?: {
    icon: ReactNode
    onClick: () => void
    label?: string
  }
  size?: 'sm' | 'md' | 'lg'
}

export default function StatsCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  iconColor = 'blue',
  iconBg,
  action,
  size = 'md'
}: StatsCardProps) {
  const cardHeight = size === 'sm' ? 120 : size === 'lg' ? 180 : 140

  return (
    <Card
      shadow="xs"
      padding="lg"
      radius="md"
      withBorder
      style={{
        height: cardHeight,
        background: 'white',
        border: '1px solid #e9ecef',
        transition: 'all 0.2s ease',
        cursor: action ? 'pointer' : 'default'
      }}
      styles={{
        root: {
          '&:hover': {
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            transform: action ? 'translateY(-2px)' : 'none'
          }
        }
      }}
    >
      <Stack gap="xs" h="100%" justify="space-between">
        {/* Header with icon and action */}
        <Group justify="space-between" align="flex-start">
          <Group gap="sm">
            {icon && (
              <ThemeIcon
                size={size === 'sm' ? 32 : size === 'lg' ? 44 : 38}
                radius="md"
                color={iconColor}
                variant={iconBg ? 'filled' : 'light'}
                style={iconBg ? { backgroundColor: iconBg } : {}}
              >
                {icon}
              </ThemeIcon>
            )}
            <div>
              <Text size="sm" c="dimmed" fw={500}>
                {title}
              </Text>
            </div>
          </Group>
          
          {action && (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={action.onClick}
              title={action.label}
            >
              {action.icon}
            </ActionIcon>
          )}
        </Group>

        {/* Main value */}
        <div>
          <Text
            size={size === 'sm' ? 'xl' : size === 'lg' ? '2rem' : 'xl'}
            fw={700}
            c="dark"
            style={{ lineHeight: 1.2 }}
          >
            {value}
          </Text>
          
          {/* Subtitle and trend */}
          <Group gap="xs" mt={4}>
            {subtitle && (
              <Text size="xs" c="dimmed">
                {subtitle}
              </Text>
            )}
            
            {trend && (
              <Group gap={4}>
                <ThemeIcon
                  size={16}
                  radius="xl"
                  variant="light"
                  color={trend.type === 'up' ? 'green' : 'red'}
                >
                  {trend.type === 'up' ? (
                    <IconTrendingUp size={10} />
                  ) : (
                    <IconTrendingDown size={10} />
                  )}
                </ThemeIcon>
                <Text
                  size="xs"
                  c={trend.type === 'up' ? 'green' : 'red'}
                  fw={500}
                >
                  {trend.value}
                </Text>
              </Group>
            )}
          </Group>
        </div>
      </Stack>
    </Card>
  )
}
