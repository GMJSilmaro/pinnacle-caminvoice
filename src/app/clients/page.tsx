import App from "../../components/layouts/App"
import ClientsPage from "../../components/pages/ClientsPage"

export const metadata = {
  title: "Clients - CamInvoice",
  description: "Manage your client relationships and contacts",
}

export default function Clients() {
  return (
    <App>
      <ClientsPage />
    </App>
  )
}
