'use client'

import { ReactNode } from 'react'
import { Stack } from '@mantine/core'
import PageHeader from './PageHeader'
import classes from './PageHeader.module.css'

interface PageLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
  badge?: {
    text: string
    color: string
  }
  actions?: ReactNode
  onBack?: () => void
  showBackButton?: boolean
  showHeader?: boolean
  stickyContent?: ReactNode
}

export default function PageLayout({
  children,
  title,
  subtitle,
  badge,
  actions,
  onBack,
  showBackButton = true,
  showHeader = true,
  stickyContent,
}: PageLayoutProps) {
  return (
    <Stack gap={0}>
      {showHeader && title && (
        <PageHeader
          title={title}
          subtitle={subtitle}
          badge={badge}
          actions={actions}
          onBack={onBack}
          showBackButton={showBackButton}
        />
      )}

      {stickyContent && (
        <div style={{
          padding: '0 var(--mantine-spacing-md) var(--mantine-spacing-md) var(--mantine-spacing-md)',
          marginBottom: '0.5rem',
          zIndex: 99,
        }}>
          {stickyContent}
        </div>
      )}

      <div className={showHeader && title ? classes.overlapContent : ''}>
        <div style={{ padding: 'var(--mantine-spacing-md)' }}>
          <Stack gap="xl">
            {children}
          </Stack>
        </div>
      </div>
    </Stack>
  )
}
