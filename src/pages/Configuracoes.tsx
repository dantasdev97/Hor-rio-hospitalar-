import { useState, useRef } from "react"
import {
  Hospital, Database, Info, Settings2, Building2, Clock,
  CheckCircle2, XCircle, Loader2, Upload, AlertTriangle,
  ShieldCheck, CalendarDays, Users, Stethoscope, Phone,
  Mail, Hash, ImageIcon,
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useConfig } from "@/contexts/ConfigContext"
import type { EmpresaConfig, HorariosConfig } from "@/contexts/ConfigContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

// ─── Check item ──────────────────────────────────────────────────────────────

interface CheckItem {
  label: string
  status: "pending" | "ok" | "error"
  detail?: string
}

// ─── Setting row ─────────────────────────────────────────────────────────────

function SettingRow({ label, description, children }: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ─── Number stepper ──────────────────────────────────────────────────────────

function NumberStepper({ value, onChange, min, max, suffix }: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="h-8 w-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-base leading-none shadow-sm"
      >−</button>
      <span className="w-14 text-center text-sm font-semibold text-gray-800 tabular-nums">
        {value}{suffix}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="h-8 w-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-base leading-none shadow-sm"
      >+</button>
    </div>
  )
}

// ─── System check modal ──────────────────────────────────────────────────────

function SystemCheckModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [checks, setChecks] = useState<CheckItem[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)

  async function runChecks() {
    setDone(false)
    setRunning(true)

    const items: CheckItem[] = [
      { label: "Ligação ao Supabase",        status: "pending" },
      { label: "Tabela: auxiliares",          status: "pending" },
      { label: "Tabela: turnos",              status: "pending" },
      { label: "Tabela: doutores",            status: "pending" },
      { label: "Tabela: restricoes",          status: "pending" },
      { label: "Tabela: escalas",             status: "pending" },
      { label: "Tabela: configuracoes",       status: "pending" },
      { label: "Tabela: perfil_coordenador",  status: "pending" },
      { label: "Variáveis de ambiente",       status: "pending" },
    ]
    setChecks([...items])

    function update(index: number, status: "ok" | "error", detail?: string) {
      setChecks((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], status, detail }
        return next
      })
    }

    // 0 — Supabase connection
    try {
      const { error } = await supabase.from("auxiliares").select("id").limit(1)
      if (error) update(0, "error", error.message)
      else update(0, "ok", "Conectado")
    } catch { update(0, "error", "Sem resposta") }

    // 1–5 — Core tables
    const tables = ["auxiliares", "turnos", "doutores", "restricoes", "escalas"] as const
    for (let i = 0; i < tables.length; i++) {
      try {
        const { count, error } = await supabase.from(tables[i]).select("*", { count: "exact", head: true })
        if (error) update(i + 1, "error", error.message)
        else update(i + 1, "ok", `${count ?? 0} registos`)
      } catch { update(i + 1, "error", "Inacessível") }
    }

    // 6 — configuracoes
    try {
      const { count, error } = await supabase.from("configuracoes").select("*", { count: "exact", head: true })
      if (error) update(6, "error", error.message)
      else update(6, "ok", `${count ?? 0} entradas`)
    } catch { update(6, "error", "Inacessível") }

    // 7 — perfil_coordenador
    try {
      const { count, error } = await supabase.from("perfil_coordenador").select("*", { count: "exact", head: true })
      if (error) update(7, "error", error.message)
      else update(7, "ok", `${count ?? 0} perfis`)
    } catch { update(7, "error", "Inacessível") }

    // 8 — Env vars
    const hasUrl = !!import.meta.env.VITE_SUPABASE_URL
    const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY
    if (hasUrl && hasKey) update(8, "ok", "URL + ANON_KEY")
    else update(8, "error", `Faltam: ${!hasUrl ? "URL " : ""}${!hasKey ? "ANON_KEY" : ""}`)

    setRunning(false)
    setDone(true)
  }

  // auto-run on open
  const [prevOpen, setPrevOpen] = useState(false)
  if (open && !prevOpen) { setPrevOpen(true); runChecks() }
  if (!open && prevOpen) { setPrevOpen(false) }

  const allOk = done && checks.every((c) => c.status === "ok")

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md animate-in fade-in zoom-in-95 duration-300" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
            <Settings2 className="h-5 w-5 text-primary-600" />
            Verificação do Sistema
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5 my-2">
          {checks.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            checks.map((check, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50 px-3 py-2.5 animate-in fade-in duration-300 transition-all hover:shadow-sm hover:border-gray-200" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  {check.status === "pending" && <Loader2 className="h-4 w-4 animate-spin text-gray-400 shrink-0" />}
                  {check.status === "ok"      && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 animate-in zoom-in duration-300" />}
                  {check.status === "error"   && <XCircle className="h-4 w-4 text-red-500 shrink-0 animate-in zoom-in duration-300" />}
                  <span className="text-sm font-medium text-gray-700 truncate">{check.label}</span>
                </div>
                {check.detail && (
                  <span className={`text-xs ml-2 shrink-0 font-mono ${check.status === "ok" ? "text-emerald-600" : "text-red-500"} animate-in fade-in slide-in-from-right duration-300`}>
                    {check.detail}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {done && (
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium border animate-in fade-in slide-in-from-bottom-2 duration-500 transition-all ${
            allOk
              ? "bg-emerald-50 text-emerald-800 border-emerald-100"
              : "bg-red-50 text-red-800 border-red-100"
          }`}>
            {allOk
              ? <><CheckCircle2 className="h-4 w-4 animate-in zoom-in duration-300" /> Tudo em ordem! Sistema operacional.</>
              : <><AlertTriangle className="h-4 w-4 animate-in zoom-in duration-300" /> {checks.filter(c => c.status === "error").length} problema(s) detetado(s).</>
            }
          </div>
        )}

        <DialogFooter className="animate-in fade-in duration-500 delay-200">
          <Button variant="outline" onClick={runChecks} disabled={running} className="transition-all">
            {running ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> A verificar...</> : "Reverificar"}
          </Button>
          <Button onClick={onClose} className="transition-all">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Empresa Tab ─────────────────────────────────────────────────────────────

function TabEmpresa() {
  const { empresa, saveEmpresa } = useConfig()
  const [config, setConfig] = useState<EmpresaConfig>(empresa)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function update(key: keyof EmpresaConfig, value: string | null) {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    await saveEmpresa(config)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => update("logo", reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Logo */}
      <Card className="overflow-hidden animate-in fade-in slide-in-from-left duration-500">
        <CardHeader className="pb-3 bg-gradient-to-r from-primary-50/30 to-white border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary-600" /> Logotipo da Instituição
          </CardTitle>
          <CardDescription>Aparece na sidebar e nos documentos exportados (PDF)</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex items-start gap-5">
            <div
              onClick={() => fileRef.current?.click()}
              className="h-24 w-36 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100/80 overflow-hidden cursor-pointer hover:border-primary-400 hover:bg-primary-50 hover:shadow-md transition-all duration-300 group transform hover:scale-105"
            >
              {config.logo ? (
                <img src={config.logo} alt="Logo" className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-110" />
              ) : (
                <div className="text-center">
                  <Hospital className="h-7 w-7 text-gray-300 mx-auto group-hover:text-primary-400 transition-all duration-300 group-hover:scale-125" />
                  <p className="text-[10px] text-gray-400 mt-1.5 group-hover:text-primary-500">Clique para carregar</p>
                </div>
              )}
            </div>
            <div className="space-y-2.5 pt-1 animate-in fade-in slide-in-from-left duration-500 delay-100">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5 transition-all hover:shadow-sm">
                <Upload className="h-3.5 w-3.5" /> Carregar imagem
              </Button>
              {config.logo && (
                <Button
                  variant="outline" size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 gap-1.5 flex transition-all"
                  onClick={() => update("logo", null)}
                >
                  Remover logo
                </Button>
              )}
              <p className="text-[11px] text-gray-400 leading-relaxed">PNG, JPG ou SVG<br />Máximo 2 MB</p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        </CardContent>
      </Card>

      {/* Dados da instituição */}
      <Card className="overflow-hidden animate-in fade-in slide-in-from-left duration-500 delay-150">
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-50/30 to-white border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" /> Dados da Instituição
          </CardTitle>
          <CardDescription>Informações que aparecem nos cabeçalhos das escalas e relatórios</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 animate-in fade-in duration-500 delay-200">
              <Label htmlFor="nome_hospital" className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <Building2 className="h-3 w-3" /> Nome do Hospital / Instituição
              </Label>
              <Input id="nome_hospital" value={config.nome} onChange={(e) => update("nome", e.target.value)} placeholder="Ex: Hospital Leiria CHL" className="h-9 transition-all focus:shadow-md" />
            </div>
            <div className="space-y-1.5 animate-in fade-in duration-500 delay-[250ms]">
              <Label htmlFor="departamento" className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <Hash className="h-3 w-3" /> Serviço / Departamento
              </Label>
              <Input id="departamento" value={config.departamento} onChange={(e) => update("departamento", e.target.value)} placeholder="Ex: Imagiologia" className="h-9 transition-all focus:shadow-md" />
            </div>
            <div className="space-y-1.5 animate-in fade-in duration-500 delay-300">
              <Label htmlFor="telefone" className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> Telefone
              </Label>
              <Input id="telefone" value={config.telefone} onChange={(e) => update("telefone", e.target.value)} placeholder="Ex: 244 812 000" className="h-9 transition-all focus:shadow-md" />
            </div>
            <div className="space-y-1.5 animate-in fade-in duration-500 delay-[350ms]">
              <Label htmlFor="email_inst" className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> Email institucional
              </Label>
              <Input id="email_inst" type="email" value={config.email} onChange={(e) => update("email", e.target.value)} placeholder="Ex: geral@chln.min-saude.pt" className="h-9 transition-all focus:shadow-md" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end animate-in fade-in slide-in-from-bottom duration-500 delay-300">
        <Button onClick={handleSave} disabled={saving} className="min-w-[150px] transition-all hover:shadow-lg">
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> A guardar...</>
            : saved
            ? <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Guardado!</>
            : "Guardar alterações"
          }
        </Button>
      </div>
    </div>
  )
}

// ─── Horários Tab ─────────────────────────────────────────────────────────────

function TabHorarios() {
  const { horarios, saveHorarios } = useConfig()
  const [config, setConfig] = useState<HorariosConfig>(horarios)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggle(key: keyof HorariosConfig) {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  function setNum(key: keyof HorariosConfig, value: number) {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    await saveHorarios(config)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Regras de bloqueio */}
      <Card className="overflow-hidden animate-in fade-in slide-in-from-left duration-500 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 bg-gradient-to-r from-red-50/40 to-white border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-red-600" /> Regras de Bloqueio
          </CardTitle>
          <CardDescription>Restrições automáticas aplicadas na geração de escalas</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-gray-100 pt-1">
          <div className="animate-in fade-in duration-500 delay-100">
            <SettingRow
              label="Bloquear turnos consecutivos"
              description="Impede que o mesmo auxiliar realize dois turnos seguidos sem descanso adequado"
            >
              <Switch checked={config.bloquearTurnosConsecutivos} onCheckedChange={() => toggle("bloquearTurnosConsecutivos")} className="transition-all" />
            </SettingRow>
          </div>
          <div className="animate-in fade-in duration-500 delay-150">
            <SettingRow
              label="Horas mínimas de descanso"
              description="Intervalo mínimo obrigatório entre o fim de um turno e o início do seguinte"
            >
              <NumberStepper value={config.horasDescansMinimas} onChange={(v) => setNum("horasDescansMinimas", v)} min={8} max={24} suffix="h" />
            </SettingRow>
          </div>
        </CardContent>
      </Card>

      {/* Limites semanais */}
      <Card className="overflow-hidden animate-in fade-in slide-in-from-left duration-500 delay-75 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-50/40 to-white border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-600" /> Limites Semanais
          </CardTitle>
          <CardDescription>Quotas máximas por auxiliar em cada semana</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-gray-100 pt-1">
          <div className="animate-in fade-in duration-500 delay-150">
            <SettingRow label="Máximo de turnos por semana" description="Limite total de turnos que um auxiliar pode realizar numa semana">
              <NumberStepper value={config.maxTurnosSemana} onChange={(v) => setNum("maxTurnosSemana", v)} min={1} max={7} />
            </SettingRow>
          </div>
          <div className="animate-in fade-in duration-500 delay-200">
            <SettingRow label="Máximo de turnos noturnos por semana" description="Limite de turnos noturnos (ex: N5, T21+) por semana">
              <NumberStepper value={config.maxTurnosNoturnos} onChange={(v) => setNum("maxTurnosNoturnos", v)} min={0} max={7} />
            </SettingRow>
          </div>
        </CardContent>
      </Card>

      {/* Limites mensais */}
      <Card className="overflow-hidden animate-in fade-in slide-in-from-left duration-500 delay-150 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 bg-gradient-to-r from-violet-50/40 to-white border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-violet-600" /> Limites Mensais
          </CardTitle>
          <CardDescription>Quotas máximas por auxiliar em cada mês</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-gray-100 pt-1">
          <div className="animate-in fade-in duration-500 delay-200">
            <SettingRow label="Máximo de turnos por mês" description="Limite total de turnos atribuíveis a um auxiliar num mês">
              <NumberStepper value={config.maxTurnosMes} onChange={(v) => setNum("maxTurnosMes", v)} min={1} max={31} />
            </SettingRow>
          </div>
          <div className="animate-in fade-in duration-500 delay-250">
            <SettingRow label="Máximo de turnos noturnos por mês" description="Limite de turnos noturnos por mês">
              <NumberStepper value={config.maxTurnosNoturnosMes} onChange={(v) => setNum("maxTurnosNoturnosMes", v)} min={0} max={20} />
            </SettingRow>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      <Card className="overflow-hidden animate-in fade-in slide-in-from-left duration-500 delay-[225ms] hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 bg-gradient-to-r from-amber-50/40 to-white border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> Alertas e Substituições
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-gray-100 pt-1">
          <div className="animate-in fade-in duration-500 delay-250">
            <SettingRow label="Alertas de conflito" description="Mostra avisos quando são detetados conflitos de horário ou restrições violadas">
              <Switch checked={config.alertasConflito} onCheckedChange={() => toggle("alertasConflito")} className="transition-all" />
            </SettingRow>
          </div>
          <div className="animate-in fade-in duration-500 delay-300">
            <SettingRow label="Permitir substituições urgentes" description="Permite atribuir auxiliares indisponíveis em situações de emergência">
              <Switch checked={config.permitirSubstituicoes} onCheckedChange={() => toggle("permitirSubstituicoes")} className="transition-all" />
            </SettingRow>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end animate-in fade-in slide-in-from-bottom duration-500 delay-300">
        <Button onClick={handleSave} disabled={saving} className="min-w-[150px] transition-all hover:shadow-lg">
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> A guardar...</>
            : saved
            ? <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Guardado!</>
            : "Guardar alterações"
          }
        </Button>
      </div>
    </div>
  )
}

// ─── Sistema Tab ──────────────────────────────────────────────────────────────

function TabSistema({ onCheckSystem }: { onCheckSystem: () => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
      <Card className="overflow-hidden animate-in fade-in slide-in-from-left duration-500 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 bg-gradient-to-r from-gray-50/60 to-white border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Hospital className="h-4 w-4 text-primary-600" />
            <CardTitle className="text-sm font-semibold text-gray-700">Aplicação</CardTitle>
          </div>
          <CardDescription>Informações gerais do sistema</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-2 text-sm">
          {[
            ["Nome",   "HospitalEscalas"],
            ["Versão", "1.0.0"],
            ["Stack",  "React 19 + Supabase"],
            ["Build",  "Vite 7"],
          ].map(([label, val], idx) => (
            <div key={label} className="flex justify-between items-center animate-in fade-in duration-500 transition-all" style={{ animationDelay: `${100 + idx * 75}ms` }}>
              <span className="text-gray-500">{label}</span>
              <span className="text-xs font-mono bg-gradient-to-r from-gray-100 to-gray-50 px-2 py-0.5 rounded text-gray-700 transition-all hover:shadow-sm">{val}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="overflow-hidden animate-in fade-in slide-in-from-right duration-500 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 bg-gradient-to-r from-emerald-50/40 to-white border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-sm font-semibold text-gray-700">Base de Dados</CardTitle>
          </div>
          <CardDescription>Supabase (PostgreSQL)</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-3 text-sm">
          <div className="flex justify-between items-center animate-in fade-in duration-500 delay-100">
            <span className="text-gray-500">Projeto</span>
            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 truncate max-w-[130px] transition-all hover:shadow-sm">
              {import.meta.env.VITE_SUPABASE_URL?.split("//")[1]?.split(".")[0] ?? "—"}
            </span>
          </div>
          <div className="flex justify-between items-center animate-in fade-in duration-500 delay-150">
            <span className="text-gray-500">Estado</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium text-xs">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Ligado
            </span>
          </div>
          <Separator className="my-1" />
          <Button size="sm" variant="outline" className="w-full gap-1.5 animate-in fade-in duration-500 delay-200 transition-all hover:shadow-md" onClick={onCheckSystem}>
            <Settings2 className="h-3.5 w-3.5" /> Verificar sistema
          </Button>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 overflow-hidden animate-in fade-in slide-in-from-bottom duration-500 delay-75 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 bg-gradient-to-r from-purple-50/30 to-white border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-sm font-semibold text-gray-700">Módulos Disponíveis</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[
              { label: "Horário Mensal",          icon: CalendarDays },
              { label: "Horário Semanal",          icon: CalendarDays },
              { label: "Gestão de Auxiliares",     icon: Users },
              { label: "Gestão de Turnos",         icon: Clock },
              { label: "Gestão de Doutores",       icon: Stethoscope },
              { label: "Restrições de Horários",   icon: ShieldCheck },
              { label: "Export PDF",               icon: Info },
              { label: "Partilha WhatsApp",        icon: Info },
            ].map(({ label, icon: Icon }, idx) => (
              <li key={label} className="flex items-center gap-2 text-sm text-gray-600 animate-in fade-in duration-500 transition-all hover:text-primary-700 group cursor-pointer" style={{ animationDelay: `${150 + idx * 60}ms` }}>
                <div className="h-6 w-6 rounded-md bg-primary-50/60 flex items-center justify-center shrink-0 transition-all group-hover:bg-primary-100 group-hover:scale-110">
                  <Icon className="h-3.5 w-3.5 text-primary-600 transition-all" />
                </div>
                {label}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Configuracoes() {
  const [checkOpen, setCheckOpen] = useState(false)

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6 animate-in fade-in slide-in-from-top duration-500">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 animate-in fade-in slide-in-from-left duration-500">Configurações</h1>
          <p className="text-sm text-gray-500 mt-1 animate-in fade-in slide-in-from-left duration-500 delay-100">Gerir empresa, regras de horários e sistema</p>
        </div>
        <Button variant="outline" onClick={() => setCheckOpen(true)} className="gap-1.5 animate-in fade-in zoom-in-95 duration-500 delay-150 transition-all hover:shadow-md">
          <Settings2 className="h-4 w-4" /> Verificar Sistema
        </Button>
      </div>

      <Tabs defaultValue="empresa" className="animate-in fade-in duration-500 delay-200">
        <TabsList className="mb-5 bg-gradient-to-r from-gray-100/80 to-white border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom duration-500 delay-200">
          <TabsTrigger value="empresa" className="gap-1.5 transition-all data-[state=active]:shadow-sm">
            <Building2 className="h-3.5 w-3.5" /> Empresa
          </TabsTrigger>
          <TabsTrigger value="horarios" className="gap-1.5 transition-all data-[state=active]:shadow-sm">
            <Clock className="h-3.5 w-3.5" /> Horários
          </TabsTrigger>
          <TabsTrigger value="sistema" className="gap-1.5 transition-all data-[state=active]:shadow-sm">
            <Database className="h-3.5 w-3.5" /> Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="animate-in fade-in duration-300"><TabEmpresa /></TabsContent>
        <TabsContent value="horarios" className="animate-in fade-in duration-300"><TabHorarios /></TabsContent>
        <TabsContent value="sistema" className="animate-in fade-in duration-300"><TabSistema onCheckSystem={() => setCheckOpen(true)} /></TabsContent>
      </Tabs>

      <SystemCheckModal open={checkOpen} onClose={() => setCheckOpen(false)} />
    </div>
  )
}
