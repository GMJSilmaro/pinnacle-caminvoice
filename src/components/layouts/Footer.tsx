import { IconBrandInstagram, IconBrandTwitter, IconBrandYoutube } from '@tabler/icons-react';
import { ActionIcon, Container, Group, Text } from '@mantine/core';
import { MantineLogoRounded } from '../MantineLogoRounded';
import { useStore } from '../../store/useStore';
import classes from './styles/Footer.module.css';

const data = [
  {
    title: 'Resources',
    links: [
      { label: 'Help Center', link: '#' },
      { label: 'Documentation', link: '#' },
      { label: 'API Reference', link: '#' },
      { label: 'Video Tutorials', link: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', link: '#' },
      { label: 'Careers', link: '#' },
      { label: 'Contact Us', link: '#' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact Support', link: '#' },
      { label: 'Feature Requests', link: '#' },
      { label: 'System Status', link: '#' },
      { label: 'Security', link: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', link: '#' },
      { label: 'Terms of Service', link: '#' },
      { label: 'Cookie Policy', link: '#' },
      { label: 'GDPR Compliance', link: '#' },
      { label: 'Data Processing', link: '#' },
    ],
  },
];

export function FooterLinks() {
  const { isNavbarCollapse } = useStore();

  const groups = data.map((group) => {
    const links = group.links.map((link, index) => (
      <Text<'a'>
        key={index}
        className={classes.link}
        component="a"
        href={link.link}
        onClick={(event) => event.preventDefault()}
      >
        {link.label}
      </Text>
    ));

    return (
      <div className={classes.wrapper} key={group.title}>
        <Text className={classes.title}>{group.title}</Text>
        {links}
      </div>
    );
  });

  return (
    <footer
      className={`${classes.footer} ${isNavbarCollapse ? classes.footerCollapsed : classes.footerExpanded}`}
    >
      <Container className={classes.inner}>
        <div className={classes.logo}>
          <Group gap={8} align="center">
            <MantineLogoRounded size={28} color="orange" />
            <Text size="lg" fw={600} c="dark">
              CamInvoice
            </Text>
          </Group>
          <Text size="xs" c="dimmed" className={classes.description}>
            Professional invoicing and client management platform designed for modern businesses.
            Streamline your billing process with powerful automation and insights.
          </Text>
        </div>
        <div className={classes.groups}>{groups}</div>
      </Container>
      <Container className={classes.afterFooter}>
        <Text c="dimmed" size="sm">
          © 2024 CamInvoice. All rights reserved.
        </Text>

        <Group gap={0} className={classes.social} justify="flex-end" wrap="nowrap">
          <ActionIcon size="lg" color="gray" variant="subtle">
            <IconBrandTwitter size={18} stroke={1.5} />
          </ActionIcon>
          <ActionIcon size="lg" color="gray" variant="subtle">
            <IconBrandYoutube size={18} stroke={1.5} />
          </ActionIcon>
          <ActionIcon size="lg" color="gray" variant="subtle">
            <IconBrandInstagram size={18} stroke={1.5} />
          </ActionIcon>
        </Group>
      </Container>
    </footer>
  );
}