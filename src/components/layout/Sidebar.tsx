import { useState, useRef } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import {
  CalendarDays, Calendar, Users, Clock, Stethoscope,
  Settings, X, Hospital, LogOut, Link2, UserCircle2,
  Phone, Hash, Upload, CheckCircle2, Loader2, ChevronRight,
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

const navItems = [
  { to: "/escala-mensal",  label: "Escala Mensal",   icon: CalendarDays, color: "text-blue-400" },
  { to: "/escala-semanal", label: "Escala Semanal",  icon: Calendar,     color: "text-cyan-400" },
  { to: "/doutores",       label: "Doutores",         icon: Stethoscope,  color: "text-emerald-400" },
  { to: "/auxiliares",     label: "Auxiliares",       icon: Users,        color: "text-violet-400" },
  { to: "/turnos",         label: "Turnos",           icon: Clock,        color: "text-amber-400" },
  { to: "/turno-postos",   label: "Turnos → Postos", icon: Link2,        color: "text-rose-400" },
  { to: "/configuracoes",  label: "Configurações",   icon: Settings,     color: "text-gray-400" },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

// ─── Modal do perfil do coordenador ──────────────────────────────────────────

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
          {/* Foto */}
          <div className="flex flex-col items-center gap-3 animate-in slide-in-from-left duration-300 delay-100">
            <div
              onClick={() => fotoRef.current?.click()}
              className="h-24 w-24 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all group hover:scale-105 duration-200"
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

  async function handleSignOut() {
    await signOut()
    navigate("/login", { replace: true })
  }

  const avatarInitial = (perfil.nome || user?.email || "U").charAt(0).toUpperCase()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 flex flex-col transition-transform duration-300",
          "bg-gray-950 border-r border-white/5",
          "md:translate-x-0 md:static md:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* ── Header / Branding ─────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo dinâmica: imagem da BD ou ícone padrão */}
            <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
              {empresa.logo ? (
                <img src={empresa.logo} alt="Logo" className="h-full w-full object-contain p-0.5" />
              ) : (
                <Hospital className="h-5 w-5 text-blue-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-none truncate">
                {empresa.nome.split(" ").slice(-1)[0] || "CHL"}
              </p>
              <p className="text-[10px] text-white/40 leading-none mt-0.5 truncate">
                {empresa.departamento || "Imagiologia"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden h-7 w-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Navigation ────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, color }, idx) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  "animate-in fade-in slide-in-from-left duration-300",
                  isActive
                    ? "bg-white/10 text-white shadow-lg shadow-black/20"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                )
              }
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
                    isActive
                      ? "bg-white/15 shadow-sm"
                      : "bg-white/0 group-hover:bg-white/8"
                  )}>
                    <Icon className={cn("h-4 w-4 transition-all duration-200", isActive ? color : "text-white/40 group-hover:text-white/70")} />
                  </div>
                  <span className="flex-1 truncate">{label}</span>
                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5 text-white/30 shrink-0" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Divider ───────────────────────────────────── */}
        <div className="mx-4 border-t border-white/5" />

        {/* ── Footer / Perfil ───────────────────────────── */}
        <div className="p-3 space-y-1">
          {/* Card do coordenador clicável */}
          {user && (
            <button
              onClick={() => setPerfilOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-200 group text-left"
            >
              {/* Avatar com foto ou inicial */}
              <div className="h-8 w-8 rounded-full shrink-0 overflow-hidden ring-1 ring-white/10 transition-all group-hover:ring-white/20">
                {perfil.foto ? (
                  <img src={perfil.foto} alt="Foto" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{avatarInitial}</span>
                  </div>
                )}
              </div>

              {/* Nome + email */}
              <div className="flex-1 min-w-0">
                {perfil.nome ? (
                  <>
                    <p className="text-xs font-semibold text-white/80 truncate leading-none group-hover:text-white transition-colors">{perfil.nome}</p>
                    <p className="text-[10px] text-white/30 truncate mt-0.5 group-hover:text-white/40 transition-colors">{user.email}</p>
                  </>
                ) : (
                  <p className="text-xs text-white/40 truncate group-hover:text-white/60 transition-colors">{user.email}</p>
                )}
              </div>

              <UserCircle2 className="h-3.5 w-3.5 text-white/20 group-hover:text-white/40 shrink-0 transition-colors" />
            </button>
          )}

          {/* Logout */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group"
          >
            <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 bg-white/0 group-hover:bg-red-500/10 transition-all">
              <LogOut className="h-4 w-4" />
            </div>
            Terminar sessão
          </button>

          {/* Version */}
          <p className="text-[9px] text-white/15 text-center pt-1 tracking-wider uppercase">
            {empresa.nome ? empresa.nome.split(" ").slice(-1)[0] : "CHL"} · v1.0
          </p>
        </div>
      </aside>

      {/* Modal de perfil */}
      <PerfilModal open={perfilOpen} onClose={() => setPerfilOpen(false)} />
    </>
  )
}
