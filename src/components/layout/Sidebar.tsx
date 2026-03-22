import { useState, useRef } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import {
  CalendarDays, Calendar, Users, Clock, Stethoscope,
  Settings, X, Hospital, LogOut, Link2, UserCircle2,
  Phone, Hash, Upload, CheckCircle2, Loader2,
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
  { to: "/escala-mensal",  label: "Horário Mensal",    icon: CalendarDays },
  { to: "/escala-semanal", label: "Horário Semanal",   icon: Calendar },
  { to: "/auxiliares",     label: "Auxiliares",         icon: Users },
  { to: "/turnos",         label: "Turnos",             icon: Clock },
  { to: "/turno-postos",   label: "Turnos → Postos",   icon: Link2 },
  { to: "/doutores",       label: "Doutores",           icon: Stethoscope },
  { to: "/configuracoes",  label: "Configurações",      icon: Settings },
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

  // Sync form when modal opens
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
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle2 className="h-5 w-5 text-primary-600" />
            Perfil do Coordenador
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Foto de perfil */}
          <div className="flex flex-col items-center gap-3">
            <div
              onClick={() => fotoRef.current?.click()}
              className="h-20 w-20 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all group"
            >
              {form.foto ? (
                <img src={form.foto} alt="Foto" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-gray-300 group-hover:text-primary-300 transition-colors">
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

          {/* Campos */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="perfil_nome" className="text-xs font-medium text-gray-600">
                Nome completo
              </Label>
              <Input
                id="perfil_nome"
                value={form.nome}
                onChange={(e) => update("nome", e.target.value)}
                placeholder="Ex: Maria Silva"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                Email
              </Label>
              <Input
                value={user?.email ?? ""}
                readOnly
                disabled
                className="h-9 bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-[10px] text-gray-400">Definido pela conta de autenticação</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="perfil_tel" className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> Telemóvel
              </Label>
              <Input
                id="perfil_tel"
                value={form.telemovel}
                onChange={(e) => update("telemovel", e.target.value)}
                placeholder="Ex: 912 345 678"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="perfil_mec" className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <Hash className="h-3 w-3" /> Número mecanográfico
              </Label>
              <Input
                id="perfil_mec"
                value={form.numero_mecanografico}
                onChange={(e) => update("numero_mecanografico", e.target.value)}
                placeholder="Ex: 12345"
                className="h-9"
              />
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

  // Avatar: foto do perfil, inicial do nome, ou inicial do email
  const avatarInitial = (perfil.nome || user?.email || "U").charAt(0).toUpperCase()
  const displayName = perfil.nome || user?.email || ""

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300",
          "md:translate-x-0 md:static md:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Branding — logo dinâmica */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5 min-w-0">
            {empresa.logo ? (
              <img
                src={empresa.logo}
                alt="Logo"
                className="h-8 w-8 object-contain rounded shrink-0"
              />
            ) : (
              <Hospital className="h-6 w-6 text-primary-600 shrink-0" />
            )}
            <div className="min-w-0">
              <span className="text-sm font-bold text-gray-900 leading-none block truncate">
                {empresa.nome.split(" ").slice(-1)[0] || "CHL"}
              </span>
              <span className="text-[10px] text-gray-400 leading-none block truncate">
                {empresa.departamento || "Imagiologia"}
              </span>
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

        {/* Footer: perfil + logout */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          {/* Botão de perfil clicável */}
          {user && (
            <button
              onClick={() => setPerfilOpen(true)}
              className="flex w-full items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left group"
            >
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold shrink-0 overflow-hidden">
                {perfil.foto ? (
                  <img src={perfil.foto} alt="Foto" className="h-full w-full object-cover" />
                ) : (
                  avatarInitial
                )}
              </div>
              <div className="flex-1 min-w-0">
                {perfil.nome ? (
                  <>
                    <p className="text-xs font-semibold text-gray-700 truncate leading-none">{perfil.nome}</p>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{user.email}</p>
                  </>
                ) : (
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                )}
              </div>
              <UserCircle2 className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-400 shrink-0 transition-colors" />
            </button>
          )}

          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Terminar sessão
          </button>

          <p className="text-[10px] text-gray-300 text-center pt-1">
            {empresa.nome} · v1.0
          </p>
        </div>
      </aside>

      {/* Modal de perfil */}
      <PerfilModal open={perfilOpen} onClose={() => setPerfilOpen(false)} />
    </>
  )
}
