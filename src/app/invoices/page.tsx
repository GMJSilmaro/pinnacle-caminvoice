import App from "../../components/layouts/App"
import InvoicesPage from "../../components/pages/InvoicesPage"

export const metadata = {
  title: "Invoices - CamInvoice",
  description: "Manage your invoices and track payments",
}

export default function Invoices() {
  return (
    <App>
      <InvoicesPage />
    </App>
  )
}
