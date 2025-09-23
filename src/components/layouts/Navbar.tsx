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
  IconUser,
  IconReceipt,
  IconLogs,
  IconSettings2
} from "@tabler/icons-react"
import { MantineLogoRounded } from "../MantineLogoRounded"
import ThemeSwitch from "../ThemeSwitch"
import VersionUpdate from "../navigation/VersionUpdate"
import { useStore } from "../../store/useStore"
import classes from "./styles/Navbar.module.css"

const navlinks = [
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
    icon: IconSettings2,
    title: "Cambodia e-Invoice Settings",
    link: "/caminvoice-settings",
  },
  {
    id: 6,
    icon: IconSettings,
    title: "Settings",
    link: "/settings",
  },
]

export default function Navbar() {
  const { isNavbarCollapse, toggleNavbar } = useStore()
  const pathname = usePathname()

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

        <Flex
          w="100%"
          direction="column"
          align={isNavbarCollapse ? "center" : "start"}
          gap={14}
        >
          <Text className={classes.navTitle} fz={12} fw={500} tt="uppercase">
            {isNavbarCollapse ? "NAV" : "Navigation"}
          </Text>
          <Flex w="100%" gap={6} direction="column" align={"start"}>
            {navlinks.map(({ id, icon: Icon, title, link }) => {
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
        </Flex>
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
