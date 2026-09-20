import { useState } from "react"
import { cn } from "@/lib/utils"
import OwnersPanel from "@/components/settings/OwnersPanel"
import CategoriesPanel from "@/components/settings/CategoriesPanel"
import AccountsPanel from "@/components/settings/AccountsPanel"

const TABS = [
  { key: "owners", label: "Owners" },
  { key: "categories", label: "Categories" },
  { key: "accounts", label: "Accounts" },
] as const

type TabKey = (typeof TABS)[number]["key"]

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabKey>("owners")

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "owners" && <OwnersPanel />}
      {activeTab === "categories" && <CategoriesPanel />}
      {activeTab === "accounts" && <AccountsPanel />}
    </div>
  )
}
