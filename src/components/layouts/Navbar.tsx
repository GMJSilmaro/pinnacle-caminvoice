"use client"
import {
  ActionIcon,
  Badge,
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
import {
  IconHome,
  IconSearch,
  IconSettings,
  IconUsers,
  IconReceipt,
  IconLogs,
  IconFileText,
  IconShieldCheck,
  IconPlugConnected,
  IconUserCog
} from "@tabler/icons-react"
import { MantineLogoRounded } from "../MantineLogoRounded"
import ThemeSwitch from "../ThemeSwitch"
import VersionUpdate from "../navigation/VersionUpdate"
import { useStore } from "../../store/useStore"
import { useAuth } from "../../hooks/useAuth"
import classes from "./styles/Navbar.module.css"

interface NavLink {
  id: number
  icon: any
  title: string
  link: string
  roleRequired?: string
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
        icon: IconFileText,
        title: "Credit/Debit Notes",
        link: "/credit-notes",
      },
      {
        id: 4,
        icon: IconUsers,
        title: "Customers",
        link: "/customers",
      },
      {
        id: 5,
        icon: IconUserCog,
        title: "User Management",
        link: "/users",
      },
    ]
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
        id: 7,
        icon: IconSettings,
        title: "Settings",
        link: "/settings",
      },
      {
        id: 8,
        icon: IconShieldCheck,
        title: "Provider Connection",
        link: "/connection",
        roleRequired: "PROVIDER", // Only show for provider role
      },
       {
        id: 9,
        icon: IconShieldCheck,
        title: "Provider Admin",
        link: "/provider",
        roleRequired: "PROVIDER", // Only show for provider role
      },
    ]
  }
]

export default function Navbar() {
  const { isNavbarCollapse, toggleNavbar } = useStore()
  const pathname = usePathname()

  // Get user role from authentication context
  const { user, loading } = useAuth()
  const userRole = user?.role || null

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
      <Flex w="100%" gap={18} direction="column" align="start">
        <Group
          w="100%"
          align="center"
          justify={isNavbarCollapse ? "center" : "space-between"}
        >
          <Flex align="center" gap={6}>
            <MantineLogoRounded size={30} color="orange" />
            {!isNavbarCollapse && (
              <Text className={classes.appTitle} fw={600}>
                CamInvoice
              </Text>
            )}
          </Flex>

          {!isNavbarCollapse && (
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
              h={22}
              radius={4}
              defaultChecked
            />
          )}
        </Group>

        {isNavbarCollapse && (
          <Switch
            m="auto"
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
            h={22}
            radius={4}
            defaultChecked
          />
        )}

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
              {section.links.map(({ id, icon: Icon, title, link }) => {
                const isActive = pathname === link
                return isNavbarCollapse ? (
                  <Tooltip
                    position="right"
                    transitionProps={{
                      transition: "rotate-right",
                    }}
                    key={id}
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
                ) : (
                  <Link
                    data-collapse={isNavbarCollapse}
                    data-active={isActive}
                    className={classes.navlink}
                    href={link}
                    key={id}
                  >
                    <Icon size={18} stroke={1.5} />
                    <Text className={classes.nav_title}>{title}</Text>
                  </Link>
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
