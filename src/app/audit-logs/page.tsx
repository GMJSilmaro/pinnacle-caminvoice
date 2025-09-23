import App from "../../components/layouts/App"
import AuditLogsPage from "../../components/pages/AuditLogsPage"

export const metadata = {
  title: "Audit Logs - CamInvoice",
  description: "Monitor system activities and user actions",
}

export default function AuditLogs() {
  return (
    <App>
      <AuditLogsPage />
    </App>
  )
}
