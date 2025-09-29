"use client"
import { AppShell } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { useStore } from "../../store/useStore"
import { useNavigationProgress } from "../../hooks/useNavigationProgress"
import Header from "./Header"
import Navbar from "./Navbar"
// import { FooterLinks } from "./Footer"
import classes from "./styles/App.module.css"

interface Props {
  children: React.ReactNode
}

export default function App({ children }: Props) {
  const [opened, { toggle }] = useDisclosure()
  const { isNavbarCollapse } = useStore()

  // Initialize navigation progress
  useNavigationProgress()

  return (
    <div className={classes.layoutWrapper}>
      <AppShell
        header={{ height: 60 }}
        classNames={{
          root: classes.root,
          navbar: classes.navbar,
          header: classes.header,
          main: classes.main,
        }}
        navbar={{
          width: isNavbarCollapse ? 60 : 260,
          breakpoint: "md",
          collapsed: { mobile: !opened },
        }}
      >
        <AppShell.Header>
          <Header opened={opened} toggle={toggle} />
        </AppShell.Header>
        <AppShell.Navbar data-collpased={isNavbarCollapse}>
          <Navbar />
        </AppShell.Navbar>
        <AppShell.Main>
          {children}
        </AppShell.Main>
      </AppShell>
       {/* <FooterLinks /> */}
    </div>
  )
}
