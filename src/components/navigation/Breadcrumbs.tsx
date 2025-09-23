"use client"
import {
  Breadcrumbs as MantineBreadcrumbs,
  Anchor,
  Text,
  Group,
  ActionIcon,
} from "@mantine/core"
import {
  IconHome,
  IconChevronRight,
  IconReceipt,
  IconUser,
  IconLogs,
  IconSettings,
} from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

// Navigation configuration matching your existing Navbar
const navigationConfig = [
  {
    id: 1,
    icon: IconHome,
    title: "Dashboard",
    link: "/",
  },
  {
    id: 2,
    icon: IconReceipt,
    title: "Invoices",
    link: "/invoices",
  },
  {
    id: 3,
    icon: IconUser,
    title: "Clients",
    link: "/clients",
  },
  {
    id: 4,
    icon: IconLogs,
    title: "Audit Logs",
    link: "/audit-logs",
  },
  {
    id: 5,
    icon: IconSettings,
    title: "Settings",
    link: "/settings",
  },
]

interface BreadcrumbItem {
  title: string
  href?: string
  icon?: React.ComponentType<any>
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  showHome?: boolean
  separator?: React.ReactNode
}

export default function Breadcrumbs({
  items,
  showHome = true,
  separator = <IconChevronRight size={12} />,
}: BreadcrumbsProps) {
  const pathname = usePathname()

  // Auto-generate breadcrumbs based on current path if no items provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split("/").filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []

    if (showHome) {
      breadcrumbs.push({
        title: "Dashboard",
        href: "/",
        icon: IconHome,
      })
    }

    // Find current page in navigation config
    const currentPage = navigationConfig.find(nav => nav.link === pathname)
    
    if (currentPage && pathname !== "/") {
      breadcrumbs.push({
        title: currentPage.title,
        icon: currentPage.icon,
      })
    } else if (pathSegments.length > 0 && pathname !== "/") {
      // Fallback for pages not in main navigation
      pathSegments.forEach((segment, index) => {
        const isLast = index === pathSegments.length - 1
        const href = "/" + pathSegments.slice(0, index + 1).join("/")
        
        breadcrumbs.push({
          title: segment
            .split("-")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" "),
          href: isLast ? undefined : href,
        })
      })
    }

    return breadcrumbs
  }

  const breadcrumbItems = items || generateBreadcrumbs()

  if (breadcrumbItems.length <= 1) {
    return null
  }

  const breadcrumbElements = breadcrumbItems.map((item, index) => {
    const isLast = index === breadcrumbItems.length - 1
    const Icon = item.icon

    const content = (
      <Group gap="xs" style={{ alignItems: "center" }}>
        {Icon && (
          <ActionIcon size="xs" variant="transparent" color="dimmed">
            <Icon size={12} />
          </ActionIcon>
        )}
        <Text
          size="sm"
          c={isLast ? "dark" : "dimmed"}
          fw={isLast ? 500 : 400}
        >
          {item.title}
        </Text>
      </Group>
    )

    if (item.href && !isLast) {
      return (
        <Anchor
          key={index}
          component={Link}
          href={item.href}
          style={{ textDecoration: "none" }}
        >
          {content}
        </Anchor>
      )
    }

    return <div key={index}>{content}</div>
  })

  return (
    <MantineBreadcrumbs separator={separator} separatorMargin="xs">
      {breadcrumbElements}
    </MantineBreadcrumbs>
  )
}
