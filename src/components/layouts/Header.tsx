import {
  ActionIcon,
  Avatar,
  Box,
  Burger,
  Button,
  Divider,
  Flex,
  Menu,
  Text,
  rem,
} from "@mantine/core"
import { IconSearch, IconSettings, IconTrash, IconLogout, IconLogout2, IconUserCircle } from "@tabler/icons-react"
import { Link21, Notification } from "iconsax-react"
import classes from "./styles/Header.module.css"

interface Props {
  opened: boolean
  toggle: () => void
}

export default function Header({ opened, toggle }: Props) {
  return (
    <Box className={classes.root} w="100%" h="100%">
      <Box className={classes.wrapper} w="100%" h="100%">
        <Flex align="center" gap={4}>
          <Burger
            mr={10}
            opened={opened}
            onClick={toggle}
            hiddenFrom="md"
            size="sm"
          />
          <Text lts={-0.4} fw={500} size="lg">
            Pinnacle e-Invoice Dashboard
          </Text>
          <Text size="xs" c="dimmed" ml={8}>
            BETA
          </Text>
        </Flex>
        <Flex h="100%" align="center" gap={12}>
          <Divider w={2} h="100%" orientation="vertical" />
          {/* <ActionIcon radius="sm" pos="relative" variant="subtle" size={28}>
            <Notification className={classes.noti} variant="Bold" size={20} />
            <Box
              pos="absolute"
              top={3}
              right={5}
              style={{
                width: rem(8),
                height: rem(8),
                borderRadius: rem(4),
                backgroundColor: "red",
                border: "1px solid var(--mantine-color-gray-4)",
              }}
            />
          </ActionIcon> */}

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button px={6} variant="subtle">
                <Flex align="center" gap={10}>
                  <Avatar size={30} />
                  <Flex direction="column" align="start">
                    <Text
                      className={classes.profileName}
                      fz={13}
                      lh={1}
                      fw={500}
                      lts={-0.3}
                    >
                      Pixelcare Dev
                    </Text>
                    <Text fz={11} fw={500} lts={-0.3}>
                      Frontend dev
                    </Text>
                  </Flex>
                </Flex>
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>User Management</Menu.Label>
               <Menu.Item
                leftSection={
                  <IconUserCircle style={{ width: rem(14), height: rem(14) }} />
                }
              >
                My Profile
              </Menu.Item>

              <Menu.Divider />

              <Menu.Label>Account</Menu.Label>

              <Menu.Item
                color="red"
                leftSection={
                  <IconLogout2 style={{ width: rem(14), height: rem(14) }} />
                }
              >
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Flex>
      </Box>
    </Box>
  )
}
