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
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

const navItems = [
  { to: "/escala-mensal", label: "Horário Mensal", icon: CalendarDays },
  { to: "/escala-semanal", label: "Horário Semanal", icon: Calendar },
  { to: "/auxiliares", label: "Auxiliares", icon: Users },
  { to: "/turnos", label: "Turnos", icon: Clock },
  { to: "/turno-postos", label: "Turnos → Postos", icon: Link2 },
  { to: "/doutores", label: "Doutores", icon: Stethoscope },
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

  const initial = user?.email?.charAt(0).toUpperCase() ?? "?"

  return (
    <>
      {/* Mobile overlay — frosted glass */}
      <div
        className={`sidebar-overlay ${isOpen ? "sidebar-overlay--visible" : ""}`}
        onClick={onClose}
        aria-hidden
      />

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>

        {/* ── Header ── */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <Activity className="sidebar-logo-cross" />
            </div>
            <div className="sidebar-logo-text">
              <span className="sidebar-logo-title">CHL</span>
              <span className="sidebar-logo-sub">Imagiologia</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="sidebar-close-btn"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="sidebar-nav">
          <p className="sidebar-nav-label">Navegação</p>
          <ul>
            {navItems.map(({ to, label, icon: Icon }, i) => (
              <li key={to} style={{ animationDelay: `${i * 40}ms` }} className="sidebar-nav-item">
                <NavLink
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? "sidebar-link--active" : ""}`
                  }
                >
                  <span className="sidebar-link-icon">
                    <Icon size={16} />
                  </span>
                  <span className="sidebar-link-label">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Footer ── */}
        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">{initial}</div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-role">Utilizador</span>
                <span className="sidebar-user-email">{user.email}</span>
              </div>
            </div>
          )}

          <button onClick={handleSignOut} className="sidebar-signout">
            <LogOut size={15} />
            <span>Terminar sessão</span>
          </button>

          <p className="sidebar-version">CHL · Imagiologia · v1.0</p>
        </div>
      </aside>

      <style>{`
        /* ── Base sidebar ──────────────────────────────── */
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 50;
          height: 100%;
          width: 256px;
          display: flex;
          flex-direction: column;
          overflow: hidden;

          /* Dark gradient background */
          background: linear-gradient(180deg, #0b1628 0%, #0d1f3c 60%, #091420 100%);
          border-right: 1px solid rgba(255,255,255,0.06);
          box-shadow: 4px 0 24px rgba(0,0,0,0.35);

          /* Mobile: slide in/out */
          transform: translateX(-100%);
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1),
                      box-shadow 0.3s ease;
        }

        /* Desktop: always visible */
        @media (min-width: 768px) {
          .sidebar {
            position: static;
            transform: none !important;
            z-index: auto;
            box-shadow: none;
            border-right: 1px solid rgba(255,255,255,0.06);
          }
        }

        .sidebar--open {
          transform: translateX(0);
          box-shadow: 8px 0 40px rgba(0,0,0,0.5);
        }

        /* ── Overlay ────────────────────────────────────── */
        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 40;
          background: rgba(0,0,0,0);
          backdrop-filter: blur(0px);
          transition: background 0.3s ease, backdrop-filter 0.3s ease;
          pointer-events: none;
        }

        @media (max-width: 767px) {
          .sidebar-overlay {
            display: block;
          }
          .sidebar-overlay--visible {
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
            pointer-events: all;
          }
        }

        /* ── Header ─────────────────────────────────────── */
        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.125rem 1.125rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .sidebar-logo-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(0,122,184,0.5), rgba(0,158,208,0.3));
          border: 1px solid rgba(0,143,200,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,122,184,0.25);
          transition: box-shadow 0.3s ease, transform 0.3s ease;
        }

        .sidebar-logo-icon:hover {
          box-shadow: 0 4px 16px rgba(0,158,208,0.4);
          transform: scale(1.05);
        }

        .sidebar-logo-cross {
          color: rgba(255,255,255,0.9);
          width: 18px;
          height: 18px;
        }

        .sidebar-logo-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .sidebar-logo-title {
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 0.06em;
          line-height: 1;
          font-family: 'DM Sans', sans-serif;
        }

        .sidebar-logo-sub {
          font-size: 10px;
          color: rgba(100,195,240,0.7);
          letter-spacing: 0.04em;
          line-height: 1;
          font-family: 'DM Sans', sans-serif;
        }

        .sidebar-close-btn {
          display: none;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 7px;
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }

        .sidebar-close-btn:hover {
          background: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.9);
        }

        @media (max-width: 767px) {
          .sidebar-close-btn {
            display: flex;
          }
        }

        /* ── Navigation ─────────────────────────────────── */
        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 0.75rem;
          scrollbar-width: none;
        }

        .sidebar-nav::-webkit-scrollbar {
          display: none;
        }

        .sidebar-nav-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.25);
          padding: 0 0.5rem;
          margin: 0 0 0.5rem;
          font-family: 'DM Sans', sans-serif;
        }

        .sidebar-nav ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sidebar-nav-item {
          animation: slideInLeft 0.35s cubic-bezier(0.16,1,0.3,1) both;
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* ── Nav links ──────────────────────────────────── */
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.6rem 0.75rem;
          border-radius: 9px;
          text-decoration: none;
          font-size: 13.5px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          color: rgba(255,255,255,0.5);
          transition: background 0.18s ease, color 0.18s ease, transform 0.15s ease;
          position: relative;
          overflow: hidden;
        }

        .sidebar-link::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(0,158,208,0.08), transparent);
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .sidebar-link:hover {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.85);
          transform: translateX(2px);
        }

        .sidebar-link:hover::before {
          opacity: 1;
        }

        .sidebar-link:hover .sidebar-link-icon {
          color: rgba(100,195,240,0.9);
          transform: scale(1.1);
        }

        .sidebar-link--active {
          background: linear-gradient(90deg, rgba(0,122,184,0.3), rgba(0,158,208,0.15));
          color: #64c3f0;
          border: 1px solid rgba(0,158,208,0.2);
          box-shadow: 0 2px 12px rgba(0,122,184,0.15), inset 0 1px 0 rgba(255,255,255,0.06);
        }

        .sidebar-link--active::before {
          opacity: 1;
        }

        .sidebar-link--active:hover {
          transform: none;
        }

        .sidebar-link--active .sidebar-link-icon {
          color: #64c3f0;
        }

        /* Active left accent bar */
        .sidebar-link--active::after {
          content: '';
          position: absolute;
          left: 0;
          top: 20%;
          bottom: 20%;
          width: 2.5px;
          background: linear-gradient(180deg, #009ed0, #007ab8);
          border-radius: 0 2px 2px 0;
          box-shadow: 0 0 8px rgba(0,158,208,0.6);
        }

        .sidebar-link-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          color: rgba(255,255,255,0.35);
          transition: color 0.18s ease, transform 0.18s ease;
        }

        .sidebar-link-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Footer ─────────────────────────────────────── */
        .sidebar-footer {
          padding: 0.875rem 0.875rem 1rem;
          border-top: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.5rem 0.375rem;
          border-radius: 9px;
          background: rgba(255,255,255,0.04);
          transition: background 0.2s;
        }

        .sidebar-user:hover {
          background: rgba(255,255,255,0.07);
        }

        .sidebar-user-avatar {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: linear-gradient(135deg, rgba(0,122,184,0.6), rgba(0,158,208,0.4));
          border: 1px solid rgba(0,158,208,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: #ffffff;
          flex-shrink: 0;
          font-family: 'DM Sans', sans-serif;
          box-shadow: 0 2px 6px rgba(0,122,184,0.2);
        }

        .sidebar-user-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }

        .sidebar-user-role {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(100,195,240,0.6);
          font-family: 'DM Sans', sans-serif;
          line-height: 1;
        }

        .sidebar-user-email {
          font-size: 11.5px;
          color: rgba(255,255,255,0.45);
          font-family: 'DM Sans', sans-serif;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-signout {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.55rem 0.75rem;
          border: none;
          border-radius: 9px;
          background: transparent;
          color: rgba(255,255,255,0.35);
          font-size: 13px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          text-align: left;
          transition: background 0.2s, color 0.2s;
        }

        .sidebar-signout:hover {
          background: rgba(239,68,68,0.12);
          color: #fca5a5;
        }

        .sidebar-version {
          font-size: 10px;
          color: rgba(255,255,255,0.15);
          text-align: center;
          margin: 0;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.04em;
        }
      `}</style>
    </>
  )
}
