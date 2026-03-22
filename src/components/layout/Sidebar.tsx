import { NavLink, useNavigate } from "react-router-dom"
import {
  CalendarDays,
  Calendar,
  Users,
  Clock,
  Stethoscope,
  Settings,
  X,
  LogOut,
  Link2,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

// ─── Navigation groups ─────────────────────────────────────────────────────────
const navGroups = [
  {
    label: "Escalas",
    items: [
      { to: "/escala-mensal",  label: "Escala Mensal",  icon: CalendarDays },
      { to: "/escala-semanal", label: "Escala Semanal", icon: Calendar },
    ],
  },
  {
    label: "Equipa",
    items: [
      { to: "/auxiliares", label: "Auxiliares", icon: Users },
      { to: "/doutores",   label: "Doutores",   icon: Stethoscope },
    ],
  },
  {
    label: "Gestão",
    items: [
      { to: "/turnos",       label: "Turnos",        icon: Clock },
      { to: "/turno-postos", label: "Turnos → Postos", icon: Link2 },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
]

// ─── Props ─────────────────────────────────────────────────────────────────────
interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function Sidebar({
  isOpen,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate("/login", { replace: true })
  }

  const initial = user?.email?.charAt(0).toUpperCase() ?? "?"

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sb-overlay ${isOpen ? "sb-overlay--on" : ""}`}
        onClick={onClose}
        aria-hidden
      />

      {/* Sidebar */}
      <aside className={`sb ${isOpen ? "sb--open" : ""} ${collapsed ? "sb--collapsed" : ""}`}>

        {/* ── Header ── */}
        <div className="sb-header">
          <div className="sb-logo">
            <div className="sb-logo-icon">
              <Activity size={17} className="sb-logo-cross" />
            </div>
            {!collapsed && (
              <div className="sb-logo-text">
                <span className="sb-logo-title">CHL</span>
                <span className="sb-logo-sub">Imagiologia</span>
              </div>
            )}
          </div>

          <div className="sb-header-actions">
            {/* Desktop collapse toggle */}
            <button
              onClick={onToggleCollapse}
              className="sb-toggle-btn"
              aria-label={collapsed ? "Expandir menu" : "Colapsar menu"}
              title={collapsed ? "Expandir menu" : "Colapsar menu"}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            {/* Mobile close */}
            <button
              onClick={onClose}
              className="sb-close-btn"
              aria-label="Fechar menu"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="sb-nav">
          {navGroups.map((group, gi) => (
            <div key={group.label} className="sb-group">
              {!collapsed && (
                <p className="sb-group-label">{group.label}</p>
              )}
              <ul>
                {group.items.map(({ to, label, icon: Icon }, ii) => (
                  <li
                    key={to}
                    className="sb-item"
                    style={{ animationDelay: `${(gi * 3 + ii) * 35}ms` }}
                  >
                    <NavLink
                      to={to}
                      onClick={onClose}
                      title={collapsed ? label : undefined}
                      className={({ isActive }) =>
                        `sb-link ${isActive ? "sb-link--active" : ""}`
                      }
                    >
                      <span className="sb-link-icon">
                        <Icon size={16} />
                      </span>
                      {!collapsed && (
                        <span className="sb-link-label">{label}</span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="sb-footer">
          {user && (
            <div className="sb-user" title={collapsed ? user.email : undefined}>
              <div className="sb-user-avatar">{initial}</div>
              {!collapsed && (
                <div className="sb-user-info">
                  <span className="sb-user-role">Utilizador</span>
                  <span className="sb-user-email">{user.email}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSignOut}
            className="sb-signout"
            title={collapsed ? "Terminar sessão" : undefined}
          >
            <LogOut size={15} className="sb-signout-icon" />
            {!collapsed && <span>Terminar sessão</span>}
          </button>

          {!collapsed && (
            <p className="sb-version">CHL · Imagiologia · v1.0</p>
          )}
        </div>
      </aside>

      {/* ─────────────────────── STYLES ─────────────────────── */}
      <style>{`
        /* ── Root ─────────────────────────────────────────── */
        .sb {
          position: fixed;
          top: 0; left: 0;
          z-index: 50;
          height: 100%;
          width: 260px;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border-right: 1px solid #e8ecf1;
          box-shadow: 0 0 0 rgba(0,0,0,0);
          /* mobile: hidden */
          transform: translateX(-100%);
          transition:
            transform 0.3s cubic-bezier(0.16,1,0.3,1),
            width     0.25s cubic-bezier(0.16,1,0.3,1),
            box-shadow 0.3s ease;
          overflow: hidden;
        }

        /* ── Desktop ─────────────────────────────────────── */
        @media (min-width: 768px) {
          .sb {
            position: static;
            transform: none !important;
            z-index: auto;
            box-shadow: none;
            border-right: 1px solid #e8ecf1;
            flex-shrink: 0;
          }
          .sb--collapsed {
            width: 68px;
          }
        }

        /* ── Mobile open ───────────────────────────────────── */
        .sb--open {
          transform: translateX(0) !important;
          box-shadow: 6px 0 32px rgba(0,0,0,0.12);
        }

        /* ── Overlay ────────────────────────────────────────── */
        .sb-overlay {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 40;
          background: rgba(0,0,0,0);
          backdrop-filter: blur(0);
          pointer-events: none;
          transition: background 0.3s, backdrop-filter 0.3s;
        }
        @media (max-width: 767px) {
          .sb-overlay { display: block; }
          .sb-overlay--on {
            background: rgba(15,25,45,0.45);
            backdrop-filter: blur(3px);
            pointer-events: all;
          }
        }

        /* ── Header ─────────────────────────────────────────── */
        .sb-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 0.875rem;
          height: 60px;
          border-bottom: 1px solid #f0f3f7;
          flex-shrink: 0;
          gap: 0.5rem;
        }

        .sb-logo {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          min-width: 0;
          flex: 1;
        }

        .sb-logo-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: linear-gradient(135deg, #0066b3, #0099cc);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,102,179,0.3);
          transition: box-shadow 0.25s, transform 0.25s;
        }
        .sb-logo-icon:hover {
          box-shadow: 0 4px 14px rgba(0,102,179,0.4);
          transform: scale(1.04);
        }
        .sb-logo-cross { color: #fff; }

        .sb-logo-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
          overflow: hidden;
        }
        .sb-logo-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #111827;
          letter-spacing: 0.06em;
          line-height: 1;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
        }
        .sb-logo-sub {
          font-size: 10px;
          color: #0099cc;
          letter-spacing: 0.04em;
          line-height: 1;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
        }

        .sb-header-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        /* Collapse toggle — desktop only */
        .sb-toggle-btn {
          display: none;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: 1px solid #e8ecf1;
          border-radius: 7px;
          background: #f8fafc;
          color: #6b7280;
          cursor: pointer;
          transition: background 0.18s, color 0.18s, border-color 0.18s;
          flex-shrink: 0;
        }
        .sb-toggle-btn:hover {
          background: #eff6ff;
          color: #0066b3;
          border-color: #bfdbfe;
        }
        @media (min-width: 768px) {
          .sb-toggle-btn { display: flex; }
        }

        /* Close btn — mobile only */
        .sb-close-btn {
          display: none;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: 1px solid #e8ecf1;
          border-radius: 7px;
          background: #f8fafc;
          color: #6b7280;
          cursor: pointer;
          transition: background 0.18s, color 0.18s;
        }
        .sb-close-btn:hover {
          background: #fee2e2;
          color: #dc2626;
        }
        @media (max-width: 767px) {
          .sb-close-btn { display: flex; }
        }

        /* ── Nav ─────────────────────────────────────────────── */
        .sb-nav {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 0.75rem 0.625rem;
          scrollbar-width: thin;
          scrollbar-color: #e5e7eb transparent;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        .sb-nav::-webkit-scrollbar { width: 4px; }
        .sb-nav::-webkit-scrollbar-track { background: transparent; }
        .sb-nav::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }

        .sb-group {
          margin-bottom: 0.25rem;
        }

        .sb-group-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #9ca3af;
          padding: 0.4rem 0.6rem 0.3rem;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        .sb-group ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .sb-item {
          animation: sbSlideIn 0.3s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes sbSlideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        /* ── Links ───────────────────────────────────────────── */
        .sb-link {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.55rem 0.65rem;
          border-radius: 8px;
          text-decoration: none;
          font-size: 13.5px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          color: #4b5563;
          transition: background 0.15s, color 0.15s, transform 0.12s;
          position: relative;
          white-space: nowrap;
          overflow: hidden;
        }
        .sb-link:hover {
          background: #f0f7ff;
          color: #0066b3;
          transform: translateX(2px);
        }
        .sb-link:hover .sb-link-icon {
          color: #0099cc;
          transform: scale(1.08);
        }

        /* Collapsed: center icons */
        .sb--collapsed .sb-link {
          justify-content: center;
          padding: 0.6rem;
          gap: 0;
        }
        .sb--collapsed .sb-link:hover {
          transform: scale(1.06);
        }

        /* Active */
        .sb-link--active {
          background: #eff6ff;
          color: #0066b3;
          font-weight: 600;
        }
        .sb-link--active::before {
          content: '';
          position: absolute;
          left: 0; top: 18%; bottom: 18%;
          width: 3px;
          background: linear-gradient(180deg, #0099cc, #0066b3);
          border-radius: 0 3px 3px 0;
          box-shadow: 0 0 6px rgba(0,102,179,0.4);
        }
        .sb--collapsed .sb-link--active::before {
          display: none;
        }
        .sb--collapsed .sb-link--active {
          background: #eff6ff;
          box-shadow: inset 0 0 0 1.5px #bfdbfe;
        }
        .sb-link--active .sb-link-icon {
          color: #0066b3;
        }
        .sb-link--active:hover {
          transform: none;
        }

        .sb-link-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          color: #9ca3af;
          transition: color 0.15s, transform 0.15s;
        }
        .sb-link-label {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Divider between groups (thin line) */
        .sb-group + .sb-group {
          border-top: 1px solid #f3f4f6;
          padding-top: 0.25rem;
          margin-top: 0.125rem;
        }

        /* ── Footer ──────────────────────────────────────────── */
        .sb-footer {
          padding: 0.75rem 0.625rem 0.875rem;
          border-top: 1px solid #f0f3f7;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .sb-user {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 0.5rem;
          border-radius: 8px;
          background: #f8fafc;
          border: 1px solid #f0f3f7;
          transition: background 0.18s, border-color 0.18s;
          cursor: default;
          overflow: hidden;
        }
        .sb-user:hover {
          background: #f0f7ff;
          border-color: #dbeafe;
        }
        .sb--collapsed .sb-user {
          justify-content: center;
          padding: 0.5rem;
        }

        .sb-user-avatar {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          background: linear-gradient(135deg, #0066b3, #0099cc);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
          font-family: 'DM Sans', sans-serif;
          box-shadow: 0 1px 4px rgba(0,102,179,0.25);
        }

        .sb-user-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
          overflow: hidden;
        }
        .sb-user-role {
          font-size: 9.5px;
          font-weight: 600;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #0099cc;
          font-family: 'DM Sans', sans-serif;
          line-height: 1;
        }
        .sb-user-email {
          font-size: 11px;
          color: #6b7280;
          font-family: 'DM Sans', sans-serif;
          line-height: 1.35;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sb-signout {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.5rem 0.65rem;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #9ca3af;
          font-size: 13px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: background 0.18s, color 0.18s;
          white-space: nowrap;
          overflow: hidden;
        }
        .sb-signout:hover {
          background: #fef2f2;
          color: #dc2626;
        }
        .sb-signout:hover .sb-signout-icon {
          color: #dc2626;
        }
        .sb--collapsed .sb-signout {
          justify-content: center;
          padding: 0.5rem;
        }
        .sb-signout-icon {
          flex-shrink: 0;
          transition: color 0.18s;
        }

        .sb-version {
          font-size: 10px;
          color: #d1d5db;
          text-align: center;
          margin: 0;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.04em;
          white-space: nowrap;
          overflow: hidden;
        }
      `}</style>
    </>
  )
}
