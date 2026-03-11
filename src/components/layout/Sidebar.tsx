import { NavLink, useNavigate } from "react-router-dom"
import {
  CalendarDays,
  Calendar,
  Users,
  Clock,
  Stethoscope,
  Ban,
  Settings,
  X,
  Hospital,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"

const navItems = [
  { to: "/escala-mensal", label: "Horário Mensal", icon: CalendarDays },
  { to: "/escala-semanal", label: "Horário Semanal", icon: Calendar },
  { to: "/auxiliares", label: "Auxiliares", icon: Users },
  { to: "/turnos", label: "Turnos", icon: Clock },
  { to: "/doutores", label: "Doutores", icon: Stethoscope },
  { to: "/restricoes", label: "Restrições", icon: Ban },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate("/login", { replace: true })
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300",
          // Desktop: always visible
          "md:translate-x-0 md:static md:z-auto",
          // Mobile: controlled by isOpen
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Hospital className="h-6 w-6 text-primary-600" />
            <div>
              <span className="text-base font-bold text-gray-900 leading-none block">CHL</span>
              <span className="text-[10px] text-gray-400 leading-none block">Imagiologia</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer: user + logout */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          {user && (
            <div className="flex items-center gap-2 px-1">
              <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold shrink-0">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-gray-500 truncate">{user.email}</span>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Terminar sessão
          </button>
          <p className="text-xs text-gray-300 text-center">CHL · Imagiologia · v1.0</p>
        </div>
      </aside>
    </>
  )
}
