'use client'

import { Card, Group, Text, ActionIcon, Stack } from '@mantine/core'
import { ReactNode } from 'react'

interface ContentCardProps {
  title?: string
  subtitle?: string
  children: ReactNode
  action?: {
    icon: ReactNode
    onClick: () => void
    label?: string
  }
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  withBorder?: boolean
  shadow?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  style?: React.CSSProperties
}

export default function ContentCard({
  title,
  subtitle,
  children,
  action,
  padding = 'lg',
  withBorder = true,
  shadow = 'xs',
  className,
  style
}: ContentCardProps) {
  return (
    <Card
      shadow={shadow}
      padding={padding}
      radius="md"
      withBorder={withBorder}
      className={className}
      style={{
        background: 'white',
        border: withBorder ? '1px solid #e9ecef' : 'none',
        transition: 'all 0.2s ease',
        ...style
      }}
      styles={{
        root: {
          '&:hover': {
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
          }
        }
      }}
    >
      {(title || action) && (
        <Group justify="space-between" align="flex-start" mb={title ? 'md' : 0}>
          <div>
            {title && (
              <Text size="lg" fw={600} c="dark">
                {title}
              </Text>
            )}
            {subtitle && (
              <Text size="sm" c="dimmed" mt={2}>
                {subtitle}
              </Text>
            )}
          </div>
          
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
      )}
      
      {children}
    </Card>
  )
}
