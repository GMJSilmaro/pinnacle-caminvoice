import App from "../../components/layouts/App"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <App>
      {children}
    </App>
  )
}
