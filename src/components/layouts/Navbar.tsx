"use client"

import {
  ActionIcon,
  Badge,
  Box,
  Collapse,
  Flex,
  Group,
  Popover,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
  rem,
} from "@mantine/core"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  IconHome,
  IconSearch,
  IconSettings,
  IconUsers,
  IconReceipt,
  IconLogs,
  IconFileText,
  IconShieldCheck,
  IconUserCog,
  IconDatabase,
  IconChevronDown,
  IconChevronRight,
  IconTemplate,
  IconFilePlus,
  IconFileUpload,
  IconFileInvoice,
  IconNote,
} from "@tabler/icons-react"
import { useStore } from "../../store/useStore"
import { useAuth } from "../../hooks/useAuth"
import classes from "./styles/Navbar.module.css"

interface SubNavLink {
  id: number
  icon?: any
  title: string
  link: string
  roleRequired?: string
}

interface NavLink {
  id: number
  icon: any
  title: string
  link: string
  roleRequired?: string
  subLinks?: SubNavLink[]
}

interface NavSection {
  title: string
  shortTitle: string
  links: NavLink[]
}

const navigationSections: NavSection[] = [
  {
    title: "Navigation",
    shortTitle: "NAV",
    links: [
      {
        id: 1,
        icon: IconHome,
        title: "Dashboard",
        link: "/portal",
      },
      {
        id: 2,
        icon: IconReceipt,
        title: "Invoices",
        link: "/invoices",
        subLinks: [
          {
            id: 21,
            icon: IconFilePlus,
            title: "View Invoice",
            link: "/invoices",
          },
          {
            id: 22,
            icon: IconFileUpload,
            title: "Upload Excel Invoice",
            link: "/invoices/bulk-upload",
          },
        ],
      },
      {
        id: 3,
        icon: IconNote,
        title: "Credit/Debit Note",
        link: "/credit-notes",
        subLinks: [
          {
            id: 31,
            icon: IconFilePlus,
            title: "View Credit/Debit Note",
            link: "/credit-notes",
          },
          {
            id: 32,
            icon: IconFileUpload,
            title: "Upload Excel Credit/Debit Note",
            link: "/credit-notes/bulk-upload",
          },
        ],
      },
      {
        id: 4,
        icon: IconUsers,
        title: "Customers",
        link: "/customers",
      },
      // {
      //   id: 5,
      //   icon: IconDatabase,
      //   title: "Data Export",
      //   link: "/data-export",
      // },
    ],
  },
  {
    title: "CamInvoice",
    shortTitle: "CAMINV",
    links: [
      {
        id: 5,
        icon: IconShieldCheck,
        title: "Provider Admin",
        link: "/provider",
        roleRequired: "PROVIDER", // Only show for provider role
      },
    ],
  },
  {
    title: "System",
    shortTitle: "SYS",
    links: [
      {
        id: 6,
        icon: IconLogs,
        title: "Audit Logs",
        link: "/audit-logs",
      },
      {
        id: 8,
        icon: IconUserCog,
        title: "User Management",
        link: "/users",
      },
      // {
      //   id: 9,
      //   icon: IconSettings,
      //   title: "Settings",
      //   link: "/settings",
      //   roleRequired: "TENANT_ADMIN",
      // },
      
    ],
  },
];

export default function Navbar() {
  const { isNavbarCollapse, toggleNavbar } = useStore()
  const pathname = usePathname()

  // Get user role from authentication context
  const { user, loading } = useAuth()
  const userRole = user?.role || null

  // State to track which nav items with sublinks are expanded (default: Invoices and Credit/Debit Notes expanded)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([2, 3]))

  // Toggle expanded state for a nav item
  const toggleExpanded = (id: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Tenant logo state
  const [logoSrc, setLogoSrc] = useState<string>("/")
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/settings/logo', { credentials: 'include', cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (data?.dataUrl) setLogoSrc(data.dataUrl)
      } catch {}
    }
    load()
  }, [])

  // Filter navigation sections based on user role
  const filteredSections = navigationSections
    .map(section => ({
      ...section,
      links: section.links.filter(link => {
        if (link.roleRequired) {
          // While loading, hide role-restricted links to avoid flash
          if (!userRole) return false
          return userRole === link.roleRequired
        }
        return true
      }),
    }))
    .filter(section => section.links.length > 0) // Remove empty sections


  // Prevent hydration mismatches by rendering only after mount (matches Header pattern)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return (
    <Stack
      className="hideScrollbar"
      style={{
        overflowY: "scroll",
        display: "flex",
      }}
      w="100%"
      justify="space-between"
      h="100%"
    >
      <Flex w="100%" gap={12} direction="column" align="start">
        <Group
          align="center"
          justify="space-between"
          w="100%"
        >
          <Flex align="center" gap={2}>
            <img
              src={logoSrc}
              alt="Pinnacle Logo"
              style={{
                display: 'block',
                height: 'auto',
                width: 'auto',
                maxHeight: isNavbarCollapse ? 32 : 180,
                maxWidth: isNavbarCollapse ? 32 : 180,
                objectFit: 'contain',
              }}
              decoding="async"
              loading="eager"
            />
          </Flex>

          <Switch
            checked={!isNavbarCollapse}
            onChange={toggleNavbar}
            visibleFrom="md"
            styles={{
              root: {
                height: "100%",
              },
              body: {
                height: "100%",
              },
              track: {
                cursor: "pointer",
                height: "100%",
                minWidth: rem(26),
                width: rem(20),
              },
              thumb: {
                "--switch-track-label-padding": "-1px",
                height: "90%",
                width: rem(12),
                borderRadius: rem(3),
                insetInlineStart: "var(--switch-thumb-start, 1px)",
              },
            }}
            h={20}
            radius={4}
          />
        </Group>

        {isNavbarCollapse ? (
          <Popover width={200} position="bottom" withArrow shadow="md">
            <Popover.Target>
              <ActionIcon size={40} variant="subtle">
                <IconSearch size={18} />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <TextInput
                visibleFrom="md"
                w="100%"
                radius="md"
                leftSection={<IconSearch size={18} />}
                placeholder="Search"
                classNames={{
                  input: classes.searchInput,
                }}
                rightSection={
                  <Badge radius={4} size="xs" variant="light">
                    /
                  </Badge>
                }
              />
            </Popover.Dropdown>
          </Popover>
        ) : (
          <TextInput
            visibleFrom="md"
            mt="md"
            w="100%"
            radius="md"
            leftSection={<IconSearch size={18} />}
            placeholder="Search"
            classNames={{
              input: classes.searchInput,
            }}
            rightSection={
              <Badge radius={4} size="xs" variant="light">
                /
              </Badge>
            }
          />
        )}
        {/* Navlinks */}

        {filteredSections.map((section, sectionIndex) => (
          <Flex
            key={section.title}
            w="100%"
            direction="column"
            align={isNavbarCollapse ? "center" : "start"}
            gap={14}
          >
            <Text className={classes.navTitle} fz={12} fw={500} tt="uppercase">
              {isNavbarCollapse ? section.shortTitle : section.title}
            </Text>
            <Flex w="100%" gap={6} direction="column" align={"start"}>
              {section.links.map(({ id, icon: Icon, title, link, subLinks }) => {
                const isActive = pathname === link
                const hasSubLinks = subLinks && subLinks.length > 0
                const isExpanded = expandedItems.has(id)
                const isSubLinkActive = hasSubLinks && subLinks.some(sub => pathname === sub.link)
                
                return (
                  <Box key={id} w="100%">
                    {isNavbarCollapse ? (
                      hasSubLinks ? (
                        <Popover width={200} position="right" withArrow shadow="md">
                          <Popover.Target>
                            <Tooltip
                              position="right"
                              transitionProps={{
                                transition: "rotate-right",
                              }}
                              label={
                                <Text fw={500} fz={13}>
                                  {title}
                                </Text>
                              }
                            >
                              <Link
                                data-collapse={isNavbarCollapse}
                                data-active={isActive || isSubLinkActive}
                                className={classes.navlink}
                                href={link}
                              >
                                <Icon size={18} stroke={1.5} />
                              </Link>
                            </Tooltip>
                          </Popover.Target>
                          <Popover.Dropdown p={6}>
                            <Stack gap={2}>
                              {subLinks.map((subLink) => (
                                <Link
                                  key={subLink.id}
                                  href={subLink.link}
                                  style={{
                                    textDecoration: 'none',
                                  }}
                                >
                                  <Flex 
                                    align="center" 
                                    gap={10} 
                                    px={10} 
                                    py={8} 
                                    style={{
                                      borderRadius: 6,
                                      backgroundColor: pathname === subLink.link ? 'var(--mantine-color-blue-0)' : 'transparent',
                                      color: pathname === subLink.link ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-7)',
                                      transition: 'all 0.15s ease',
                                      cursor: 'pointer',
                                    }}
                                    className={classes.submenuItem}
                                  >
                                    {subLink.icon && <subLink.icon size={16} stroke={1.8} />}
                                    <Text fz={14} fw={pathname === subLink.link ? 500 : 400} style={{ lineHeight: 1.4, letterSpacing: '-0.025rem' }}>
                                      {subLink.title}
                                    </Text>
                                  </Flex>
                                </Link>
                              ))}
                            </Stack>
                          </Popover.Dropdown>
                        </Popover>
                      ) : (
                        <Tooltip
                          position="right"
                          transitionProps={{
                            transition: "rotate-right",
                          }}
                          label={
                            <Text fw={500} fz={13}>
                              {title}
                            </Text>
                          }
                        >
                          <Link
                            data-collapse={isNavbarCollapse}
                            data-active={isActive}
                            className={classes.navlink}
                            href={link}
                          >
                            <Icon size={18} stroke={1.5} />
                          </Link>
                        </Tooltip>
                      )
                    ) : (
                      <>
                        {hasSubLinks ? (
                          <Box
                            data-collapse={isNavbarCollapse}
                            data-active={isActive || isSubLinkActive}
                            className={classes.navlink}
                            onClick={() => toggleExpanded(id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <Icon size={18} stroke={1.5} />
                            <Text className={classes.nav_title}>{title}</Text>
                            {isExpanded ? (
                              <IconChevronDown 
                                size={16} 
                                stroke={2} 
                                style={{ 
                                  marginLeft: 'auto',
                                  opacity: 0.6,
                                  transition: 'all 0.2s ease'
                                }} 
                              />
                            ) : (
                              <IconChevronRight 
                                size={16} 
                                stroke={2} 
                                style={{ 
                                  marginLeft: 'auto',
                                  opacity: 0.6,
                                  transition: 'all 0.2s ease'
                                }} 
                              />
                            )}
                          </Box>
                        ) : (
                          <Link
                            data-collapse={isNavbarCollapse}
                            data-active={isActive}
                            className={classes.navlink}
                            href={link}
                          >
                            <Icon size={18} stroke={1.5} />
                            <Text className={classes.nav_title}>{title}</Text>
                          </Link>
                        )}
                        
                        {hasSubLinks && (
                          <Collapse in={isExpanded}>
                            <Stack 
                              gap={2} 
                              pl={28} 
                              pt={6} 
                              pb={4}
                              style={{
                                borderLeft: '2px solid var(--mantine-color-gray-2)',
                                marginLeft: '8px',
                              }}
                            >
                              {subLinks.map((subLink) => (
                                <Link
                                  key={subLink.id}
                                  href={subLink.link}
                                  style={{ textDecoration: 'none' }}
                                >
                                  <Flex
                                    align="center"
                                    gap={10}
                                    px={12}
                                    py={8}
                                    style={{
                                      borderRadius: 6,
                                      backgroundColor: pathname === subLink.link ? 'var(--mantine-color-blue-0)' : 'transparent',
                                      color: pathname === subLink.link ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-7)',
                                      transition: 'all 0.15s ease',
                                      cursor: 'pointer',
                                    }}
                                    className={classes.submenuItem}
                                  >
                                    {subLink.icon && (
                                      <Box style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                        <subLink.icon size={16} stroke={1.8} />
                                      </Box>
                                    )}
                                    <Text fz={14} fw={pathname === subLink.link ? 500 : 400} style={{ lineHeight: 1.4, letterSpacing: '-0.025rem', flex: 1 }}>
                                      {subLink.title}
                                    </Text>
                                  </Flex>
                                </Link>
                              ))}
                            </Stack>
                          </Collapse>
                        )}
                      </>
                    )}
                  </Box>
                )
              })}
            </Flex>

            {/* Add divider between sections, but not after the last one */}
            {sectionIndex < filteredSections.length - 1 && (
              <div style={{
                width: '100%',
                height: '1px',
                backgroundColor: 'var(--mantine-color-gray-3)',
                margin: '8px 0'
              }} />
            )}
          </Flex>
        ))}
        {/* Navlinks */}
        {/* <Divider w="100%" /> */}
        {/* App Links */}
        {/* <Flex
          gap={14}
          w="100%"
          direction="column"
          align={isNavbarCollapse ? "center" : "start"}
        >
          <Text className={classes.navTitle} fz={12} fw={500} tt="uppercase">
            App
          </Text>
          <Flex
            w="100%"
            gap={10}
            direction="column"
            align={isNavbarCollapse ? "center" : "start"}
          >
            <UnstyledButton className={classes.appLink}>
              <Flex align="center" gap={10} pl={0}>
                <Box className={classes.appImageContainer}>
                  <Text c="white" fw={700} fz={12}>W</Text>
                </Box>
                {!isNavbarCollapse && (
                  <Text className={classes.nav_title}>Webflow</Text>
                )}
              </Flex>
            </UnstyledButton>
            <UnstyledButton className={classes.appLink}>
              <Flex align="center" gap={10} pl={0}>
                <Box bg="black" className={classes.appImageContainer}>
                  <Text c="white" fw={700} fz={12}>F</Text>
                </Box>
                {!isNavbarCollapse && (
                  <Text className={classes.nav_title}>Framer</Text>
                )}
              </Flex>
            </UnstyledButton>
            <UnstyledButton className={classes.appLink}>
              <Flex align="center" gap={10} pl={0}>
                <Box className={classes.appImageContainer}>
                  <Text c="white" fw={700} fz={12}>F</Text>
                </Box>
                {!isNavbarCollapse && (
                  <Text className={classes.nav_title}>Figma</Text>
                )}
              </Flex>
            </UnstyledButton>
          </Flex>
        </Flex> */}
        {/* App Links */}
      </Flex>

      <Flex
        direction="column"
        align="start"
        gap={14}
      >
        {/* <VersionUpdate isCollapsed={isNavbarCollapse} /> */}
        {/* <ThemeSwitch /> */}
      </Flex>
    </Stack>
  )
}
