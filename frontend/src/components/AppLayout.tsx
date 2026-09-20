import { useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/transactions", label: "Transactions" },
  { to: "/accounts", label: "Accounts" },
  { to: "/reports", label: "Reports" },
  { to: "/settings", label: "Settings" },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate("/login", { replace: true })
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
      isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
    )

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-6 min-w-0">
            <span className="font-semibold shrink-0">Trailhead</span>
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3 shrink-0">
            <span className="text-sm text-muted-foreground truncate max-w-[160px]">{user?.name}</span>
            <Button size="sm" variant="outline" onClick={handleLogout}>
              Log out
            </Button>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="md:hidden"
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden border-t px-4 py-3 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
                {item.label}
              </NavLink>
            ))}
            <div className="flex items-center justify-between pt-2 mt-1 border-t">
              <span className="text-sm text-muted-foreground truncate">{user?.name}</span>
              <Button size="sm" variant="outline" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          </div>
        )}
      </header>
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
