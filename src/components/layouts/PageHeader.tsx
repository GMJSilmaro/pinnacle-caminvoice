'use client'

import {
  Group,
  ActionIcon,
  Title,
  Text,
  Badge,
} from '@mantine/core'
import {
  IconArrowLeft,
} from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'
import classes from './PageHeader.module.css'

interface PageHeaderProps {
  title: string
  subtitle?: string
  badge?: {
    text: string
    color: string
  }
  actions?: ReactNode
  onBack?: () => void
  showBackButton?: boolean
}

export default function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  onBack,
  showBackButton = true,
}: PageHeaderProps) {
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      setIsScrolled(scrollTop > 10)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  return (
    <div
      className={`${classes.stickyHeader} ${isScrolled ? classes.scrolled : ''}`}
    >
      <Group justify="space-between" align="center">
        <Group align="center">
          {showBackButton && (
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={handleBack}
              c="white"
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
          )}
          <div>
            <Group gap="sm" align="center">
              <Title order={2} c="white">{title}</Title>
              {badge && (
                <Badge color={badge.color} variant="light">
                  {badge.text}
                </Badge>
              )}
            </Group>
            {subtitle && (
              <Text c="gray.3" size="sm">
                {subtitle}
              </Text>
            )}
          </div>
        </Group>

        {actions && (
          <Group>
            {actions}
          </Group>
        )}
      </Group>
    </div>
  )
}
