import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import { MantineProvider, ColorSchemeScript, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { NavigationProgress } from '@mantine/nprogress';
import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/code-highlight/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/nprogress/styles.css';
import '@mantine/spotlight/styles.css';
import '@mantine/tiptap/styles.css';
import '@mantine/carousel/styles.css';
import "./globals.css";

// const inter = Inter({
//   variable: "--font-inter",
//   subsets: ["latin"],
//   display: "swap",
//   fallback: ["system-ui", "arial"],
// });

const theme = createTheme({
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  fontFamilyMonospace: 'Monaco, Courier, monospace',
  headings: { fontFamily: 'Inter, system-ui, -apple-system, sans-serif' },
  primaryColor: 'blue',
  colors: {
    // Professional SaaS blue palette
    blue: [
      '#e3f2fd',
      '#bbdefb',
      '#90caf9',
      '#64b5f6',
      '#42a5f5',
      '#2196f3',
      '#1976d2',
      '#1565c0',
      '#0d47a1',
      '#0a3d91'
    ],
    // Keep existing colors for compatibility
    orange: [
      '#fff4e6',
      '#ffe8cc',
      '#ffd8a8',
      '#ffc947',
      '#ffba00',
      '#e6a700',
      '#cc9500',
      '#b38200',
      '#996f00',
      '#805c00'
    ],
    yellow: [
      '#fffbeb',
      '#fef3c7',
      '#fde68a',
      '#fcd34d',
      '#fbbf24',
      '#f59e0b',
      '#d97706',
      '#b45309',
      '#92400e',
      '#78350f'
    ],
  },
  other: {
    // Professional SaaS styling
    camInvBackground: '#ffffff',
    camInvSurface: '#f8f9fa',
    camInvText: '#212529',
  }
});

export const metadata: Metadata = {
  title: "Pinnacle - CamInvoice",
  description: "Pinnacle - CamInvoice (Development Build)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-mantine-color-scheme="light">
      <head>
        <ColorSchemeScript />
      </head>
      <body
        className="antialiased"
      >
        <MantineProvider theme={theme}>
          <NavigationProgress />
          <Notifications position="top-right" zIndex={1000} />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
