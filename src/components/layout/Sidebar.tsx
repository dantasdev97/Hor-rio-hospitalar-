import { useState, useRef } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import {
  CalendarDays, Calendar, Users, Clock, Stethoscope,
  Settings, X, Hospital, LogOut, Link2, UserCircle2,
  Phone, Hash, Upload, CheckCircle2, Loader2,
  ChevronLeft, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useConfig } from "@/contexts/ConfigContext"
import type { PerfilCoordenador } from "@/contexts/ConfigContext"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

// ─── Nav groups ───────────────────────────────────────────────────────────────

const navGroups = [
  {
    label: "Horários",
    items: [
      { to: "/escala-mensal",  label: "Escala Mensal",  icon: CalendarDays },
      { to: "/escala-semanal", label: "Escala Semanal", icon: Calendar },
    ],
  },
  {
    label: "Cadastro",
    items: [
      { to: "/doutores",   label: "Doutores",   icon: Stethoscope },
      { to: "/auxiliares", label: "Auxiliares", icon: Users },
    ],
  },
  {
    label: "Gerenciamento",
    items: [
      { to: "/turnos",       label: "Turnos",          icon: Clock },
      { to: "/turno-postos", label: "Turnos + Postos", icon: Link2 },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

// ─── Modal perfil ─────────────────────────────────────────────────────────────

function PerfilModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const { perfil, savePerfil } = useConfig()
  const [form, setForm] = useState<PerfilCoordenador>(perfil)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fotoRef = useRef<HTMLInputElement>(null)

  const [lastOpen, setLastOpen] = useState(false)
  if (open && !lastOpen) { setLastOpen(true); setForm(perfil); setSaved(false) }
  if (!open && lastOpen) { setLastOpen(false) }

  function update(key: keyof PerfilCoordenador, value: string | null) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 200 * 1024) {
      alert("A foto deve ter no máximo 200 KB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => update("foto", reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    setSaving(true)
    await savePerfil(form)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const initials = (form.nome || user?.email || "U").charAt(0).toUpperCase()

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm animate-in fade-in zoom-in-95 duration-200" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
            <UserCircle2 className="h-5 w-5 text-primary-600" />
            Perfil do Coordenador
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="flex flex-col items-center gap-3 animate-in slide-in-from-left duration-300 delay-100">
            <div
              onClick={() => fotoRef.current?.click()}
              className="h-24 w-24 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden cursor-pointer hover:border-primary-400 hover:bg-primary-50/40 hover:scale-105 transition-all duration-200 group"
            >
              {form.foto ? (
                <img src={form.foto} alt="Foto" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-gray-300 group-hover:text-primary-300 transition-colors">
                  {initials}
                </span>
              )}
            </div>
            <button
              onClick={() => fotoRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-600 transition-colors"
            >
              <Upload className="h-3 w-3" />
              {form.foto ? "Alterar foto" : "Adicionar foto"}
            </button>
            <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="perfil_nome" className="text-xs font-medium text-gray-600">Nome completo</Label>
              <Input id="perfil_nome" value={form.nome} onChange={(e) => update("nome", e.target.value)} placeholder="Ex: Maria Silva" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">Email</Label>
              <Input value={user?.email ?? ""} readOnly disabled className="h-9 bg-gray-50 text-gray-500 cursor-not-allowed" />
              <p className="text-[10px] text-gray-400">Definido pela conta de autenticação</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="perfil_tel" className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> Telemóvel
              </Label>
              <Input id="perfil_tel" value={form.telemovel} onChange={(e) => update("telemovel", e.target.value)} placeholder="Ex: 912 345 678" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="perfil_mec" className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <Hash className="h-3 w-3" /> Nº mecanográfico
              </Label>
              <Input id="perfil_mec" value={form.numero_mecanografico} onChange={(e) => update("numero_mecanografico", e.target.value)} placeholder="Ex: 12345" className="h-9" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose} size="sm">Fechar</Button>
          <Button onClick={handleSave} disabled={saving} size="sm" className="min-w-[100px]">
            {saving
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> A guardar...</>
              : saved
              ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Guardado!</>
              : "Guardar"
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { signOut, user } = useAuth()
  const { empresa, perfil } = useConfig()
  const navigate = useNavigate()
  const [perfilOpen, setPerfilOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate("/login", { replace: true })
  }

  const avatarInitial = (perfil.nome || user?.email || "U").charAt(0).toUpperCase()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full flex flex-col bg-white border-r border-gray-100 shadow-sm",
          "transition-all duration-300 ease-in-out",
          "md:translate-x-0 md:static md:z-auto",
          collapsed ? "w-[68px]" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <div className={cn(
          "flex items-center border-b border-gray-100 shrink-0 overflow-hidden",
          collapsed ? "px-3 py-4 justify-center" : "px-4 py-4 justify-between"
        )}>
          {/* Logo + nome */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0 overflow-hidden">
              {empresa.logo ? (
                <img src={empresa.logo} alt="Logo" className="h-full w-full object-contain p-0.5" />
              ) : (
                <Hospital className="h-4.5 w-4.5 text-primary-600" />
              )}
            </div>

            {!collapsed && (
              <div className="min-w-0 animate-in fade-in duration-200">
                <p className="text-sm font-semibold text-gray-900 leading-none truncate">
                  {empresa.nome.split(" ").slice(-1)[0] || "CHL"}
                </p>
                <p className="text-[10px] text-gray-400 leading-none mt-0.5 truncate">
                  {empresa.departamento || "Imagiologia"}
                </p>
              </div>
            )}
          </div>

          {/* Fechar (mobile) */}
          {!collapsed && (
            <button
              onClick={onClose}
              className="md:hidden h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Collapse toggle (desktop) ──────────────────── */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          className={cn(
            "hidden md:flex items-center justify-center",
            "h-6 w-6 rounded-full bg-white border border-gray-200 shadow-sm",
            "text-gray-400 hover:text-primary-600 hover:border-primary-300 hover:shadow-primary-100/50",
            "transition-all duration-200 hover:scale-110",
            "absolute -right-3 top-[52px] z-10"
          )}
        >
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5" />
            : <ChevronLeft className="h-3.5 w-3.5" />
          }
        </button>

        {/* ── Navigation ─────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4">
          {navGroups.map(({ label, items }, gi) => (
            <div key={label} className="space-y-0.5" style={{ animationDelay: `${gi * 60}ms` }}>
              {/* Group label */}
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest animate-in fade-in duration-200">
                  {label}
                </p>
              )}
              {collapsed && gi > 0 && (
                <div className="w-6 mx-auto border-t border-gray-100 mb-1.5" />
              )}

              {items.map(({ to, label: itemLabel, icon: Icon }, ii) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  title={collapsed ? itemLabel : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center rounded-lg text-sm font-medium transition-all duration-150",
                      "animate-in fade-in slide-in-from-left duration-300",
                      collapsed ? "justify-center px-0 py-2.5 mx-0" : "gap-3 px-3 py-2.5",
                      isActive
                        ? "bg-primary-50 text-primary-700 border-l-[3px] border-primary-500 rounded-l-none"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-transparent"
                    )
                  }
                  style={{ animationDelay: `${gi * 60 + ii * 40}ms` }}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn(
                        "h-[18px] w-[18px] shrink-0 transition-colors",
                        isActive ? "text-primary-600" : "text-gray-400"
                      )} />
                      {!collapsed && (
                        <span className="truncate">{itemLabel}</span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* ── Footer ─────────────────────────────────────── */}
        <div className={cn(
          "border-t border-gray-100 shrink-0",
          collapsed ? "p-2 space-y-1" : "p-3 space-y-1"
        )}>
          {/* Perfil do coordenador */}
          {user && (
            <button
              onClick={() => setPerfilOpen(true)}
              title={collapsed ? (perfil.nome || user.email || "Perfil") : undefined}
              className={cn(
                "w-full flex items-center rounded-xl hover:bg-gray-50 transition-all duration-150 group",
                collapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-2"
              )}
            >
              {/* Avatar */}
              <div className="h-8 w-8 rounded-full shrink-0 overflow-hidden ring-1 ring-gray-200 group-hover:ring-primary-300 transition-all">
                {perfil.foto ? (
                  <img src={perfil.foto} alt="Foto" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{avatarInitial}</span>
                  </div>
                )}
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0 text-left animate-in fade-in duration-200">
                  {perfil.nome ? (
                    <>
                      <p className="text-xs font-semibold text-gray-700 truncate leading-none group-hover:text-gray-900 transition-colors">
                        {perfil.nome}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5 group-hover:text-gray-500 transition-colors">
                        {user.email}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 truncate group-hover:text-gray-700 transition-colors">
                      {user.email}
                    </p>
                  )}
                </div>
              )}
            </button>
          )}

          {/* Logout */}
          <button
            onClick={handleSignOut}
            title={collapsed ? "Terminar sessão" : undefined}
            className={cn(
              "w-full flex items-center rounded-xl text-sm font-medium",
              "text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-150 group",
              collapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-2"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="animate-in fade-in duration-200">Terminar sessão</span>}
          </button>

          {/* Version — só quando expandido */}
          {!collapsed && (
            <p className="text-[9px] text-gray-300 text-center pt-0.5 tracking-wider uppercase animate-in fade-in duration-200">
              {empresa.nome ? empresa.nome.split(" ").slice(-1)[0] : "CHL"} · v1.0
            </p>
          )}
        </div>
      </aside>

      <PerfilModal open={perfilOpen} onClose={() => setPerfilOpen(false)} />
    </>
  )
}
