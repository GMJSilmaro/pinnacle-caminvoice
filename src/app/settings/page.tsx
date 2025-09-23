import App from "../../components/layouts/App"
import SettingsPage from "../../components/pages/SettingsPage"

export const metadata = {
  title: "Settings - CamInvoice",
  description: "Manage your account and application preferences",
}

export default function Settings() {
  return (
    <App>
      <SettingsPage />
    </App>
  )
}
