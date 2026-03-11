import { useState, useEffect, useRef } from "react"
import {
  Hospital, Database, Info, Settings2, Building2, Clock,
  CheckCircle2, XCircle, Loader2, Upload, AlertTriangle,
  ShieldCheck, CalendarDays, Users, Stethoscope,
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmpresaConfig {
  nome: string
  departamento: string
  telefone: string
  email: string
  logo: string | null   // base64
}

interface HorariosConfig {
  bloquearTurnosConsecutivos: boolean
  horasDescansMinimas: number
  maxTurnosNoturnos: number
  maxTurnosMes: number
  maxTurnosNoturnosMes: number
  alertasConflito: boolean
  permitirSubstituicoes: boolean
}

interface CheckItem {
  label: string
  status: "pending" | "ok" | "error"
  detail?: string
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const EMPRESA_KEY  = "cfg_empresa"
const HORARIOS_KEY = "cfg_horarios"

const defaultEmpresa: EmpresaConfig = {
  nome: "Hospital Leiria CHL",
  departamento: "Imagiologia",
  telefone: "",
  email: "",
  logo: null,
}

const defaultHorarios: HorariosConfig = {
  bloquearTurnosConsecutivos: true,
  horasDescansMinimas: 11,
  maxTurnosNoturnos: 2,
  alertasConflito: true,
  permitirSubstituicoes: false,
  maxTurnosMes: 22,
  maxTurnosNoturnosMes: 4,
}

function loadConfig<T>(key: string, defaults: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults
  } catch {
    return defaults
  }
}

function saveConfig<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

// ─── Setting row ──────────────────────────────────────────────────────────────

function SettingRow({ label, description, children }: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ─── Number stepper ───────────────────────────────────────────────────────────

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
        className="h-7 w-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors text-base leading-none"
      >−</button>
      <span className="w-12 text-center text-sm font-semibold text-gray-800">
        {value}{suffix}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="h-7 w-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors text-base leading-none"
      >+</button>
    </div>
  )
}

// ─── System check modal ───────────────────────────────────────────────────────

function SystemCheckModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [checks, setChecks] = useState<CheckItem[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)

  async function runChecks() {
    setDone(false)
    setRunning(true)

    const items: CheckItem[] = [
      { label: "Ligação ao Supabase", status: "pending" },
      { label: "Tabela: auxiliares",  status: "pending" },
      { label: "Tabela: turnos",      status: "pending" },
      { label: "Tabela: doutores",    status: "pending" },
      { label: "Tabela: restricoes",  status: "pending" },
      { label: "Tabela: escalas",     status: "pending" },
      { label: "Variáveis de ambiente", status: "pending" },
    ]
    setChecks([...items])

    // Helper to update a single check
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
    } catch (e) {
      update(0, "error", "Sem resposta")
    }

    // 1-5 — Tables
    const tables = ["auxiliares", "turnos", "doutores", "restricoes", "escalas"] as const
    for (let i = 0; i < tables.length; i++) {
      try {
        const { count, error } = await supabase
          .from(tables[i])
          .select("*", { count: "exact", head: true })
        if (error) update(i + 1, "error", error.message)
        else update(i + 1, "ok", `${count ?? 0} registos`)
      } catch {
        update(i + 1, "error", "Inacessível")
      }
    }

    // 6 — Env vars
    const hasUrl = !!import.meta.env.VITE_SUPABASE_URL
    const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY
    if (hasUrl && hasKey) update(6, "ok", "VITE_SUPABASE_URL + ANON_KEY")
    else update(6, "error", `Faltam: ${!hasUrl ? "URL " : ""}${!hasKey ? "ANON_KEY" : ""}`)

    setRunning(false)
    setDone(true)
  }

  useEffect(() => {
    if (open) runChecks()
    else { setChecks([]); setDone(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const allOk = done && checks.every((c) => c.status === "ok")
  const hasErrors = done && checks.some((c) => c.status === "error")

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary-600" />
            Verificação do Sistema
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 my-2">
          {checks.length === 0 ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            checks.map((check, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {check.status === "pending" && (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400 shrink-0" />
                  )}
                  {check.status === "ok" && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  )}
                  {check.status === "error" && (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <span className="text-sm font-medium text-gray-800 truncate">{check.label}</span>
                </div>
                {check.detail && (
                  <span className={`text-xs ml-2 shrink-0 ${check.status === "ok" ? "text-green-600" : "text-red-500"}`}>
                    {check.detail}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {done && (
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
            allOk ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}>
            {allOk ? (
              <><CheckCircle2 className="h-4 w-4" /> Tudo em ordem! Sistema operacional.</>
            ) : (
              <><AlertTriangle className="h-4 w-4" /> {checks.filter(c => c.status === "error").length} problema(s) detetado(s).</>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={runChecks} disabled={running}>
            {running ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> A verificar...</> : "Reverificar"}
          </Button>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Empresa Tab ─────────────────────────────────────────────────────────────

function TabEmpresa() {
  const [config, setConfig] = useState<EmpresaConfig>(() => loadConfig(EMPRESA_KEY, defaultEmpresa))
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function update(key: keyof EmpresaConfig, value: string | null) {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleSave() {
    saveConfig(EMPRESA_KEY, config)
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary-600" /> Logotipo
          </CardTitle>
          <CardDescription>Aparece nos documentos exportados (PDF, etc.)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div
              className="h-20 w-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden cursor-pointer hover:border-primary-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {config.logo ? (
                <img src={config.logo} alt="Logo" className="h-full w-full object-contain p-1" />
              ) : (
                <div className="text-center">
                  <Hospital className="h-6 w-6 text-gray-300 mx-auto" />
                  <p className="text-xs text-gray-400 mt-1">Clique para carregar</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5 mr-1" /> Carregar imagem
              </Button>
              {config.logo && (
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => update("logo", null)}>
                  Remover
                </Button>
              )}
              <p className="text-xs text-gray-400">PNG, JPG ou SVG. Máx. 2MB</p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        </CardContent>
      </Card>

      {/* Dados da empresa */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary-600" /> Dados da Instituição
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome_hospital">Nome do Hospital / Instituição</Label>
              <Input
                id="nome_hospital"
                value={config.nome}
                onChange={(e) => update("nome", e.target.value)}
                placeholder="Ex: Hospital Leiria CHL"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="departamento">Serviço / Departamento</Label>
              <Input
                id="departamento"
                value={config.departamento}
                onChange={(e) => update("departamento", e.target.value)}
                placeholder="Ex: Imagiologia"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={config.telefone}
                onChange={(e) => update("telefone", e.target.value)}
                placeholder="Ex: 244 812 000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email_inst">Email institucional</Label>
              <Input
                id="email_inst"
                type="email"
                value={config.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="Ex: geral@chln.min-saude.pt"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          {saved ? <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Guardado!</> : "Guardar alterações"}
        </Button>
      </div>
    </div>
  )
}

// ─── Horários Tab ────────────────────────────────────────────────────────────

function TabHorarios() {
  const [config, setConfig] = useState<HorariosConfig>(() => loadConfig(HORARIOS_KEY, defaultHorarios))
  const [saved, setSaved] = useState(false)

  function toggle(key: keyof HorariosConfig) {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  function setNum(key: keyof HorariosConfig, value: number) {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleSave() {
    saveConfig(HORARIOS_KEY, config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Regras de turnos */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary-600" /> Regras de Bloqueio
          </CardTitle>
          <CardDescription>Restrições automáticas aplicadas na geração de escalas</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-gray-100">
          <SettingRow
            label="Bloquear turnos consecutivos"
            description="Impede que o mesmo auxiliar realize dois turnos seguidos sem descanso adequado"
          >
            <Switch
              checked={config.bloquearTurnosConsecutivos}
              onCheckedChange={() => toggle("bloquearTurnosConsecutivos")}
            />
          </SettingRow>

          <SettingRow
            label="Horas mínimas de descanso"
            description="Intervalo mínimo obrigatório entre o fim de um turno e o início do seguinte"
          >
            <NumberStepper
              value={config.horasDescansMinimas}
              onChange={(v) => setNum("horasDescansMinimas", v)}
              min={8} max={24} suffix="h"
            />
          </SettingRow>

        </CardContent>
      </Card>

      {/* Limites semanais */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary-600" /> Limites Semanais
          </CardTitle>
          <CardDescription>Quotas máximas por auxiliar em cada semana</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-gray-100">
          <SettingRow
            label="Máximo de turnos noturnos por semana"
            description="Limite de turnos noturnos (ex: N5, T21+) por semana"
          >
            <NumberStepper
              value={config.maxTurnosNoturnos}
              onChange={(v) => setNum("maxTurnosNoturnos", v)}
              min={0} max={7} suffix=""
            />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Limites mensais */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary-600" /> Limites Mensais
          </CardTitle>
          <CardDescription>Quotas máximas por auxiliar em cada mês</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-gray-100">
          <SettingRow
            label="Máximo de turnos por mês"
            description="Limite total de turnos atribuíveis a um auxiliar num mês"
          >
            <NumberStepper
              value={config.maxTurnosMes}
              onChange={(v) => setNum("maxTurnosMes", v)}
              min={1} max={31} suffix=""
            />
          </SettingRow>

          <SettingRow
            label="Máximo de turnos noturnos por mês"
            description="Limite de turnos noturnos por mês"
          >
            <NumberStepper
              value={config.maxTurnosNoturnosMes}
              onChange={(v) => setNum("maxTurnosNoturnosMes", v)}
              min={0} max={20} suffix=""
            />
          </SettingRow>
        </CardContent>
      </Card>

      {/* Alertas e substituições */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary-600" /> Alertas e Substituições
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-gray-100">
          <SettingRow
            label="Alertas de conflito"
            description="Mostra avisos quando são detetados conflitos de horário ou restrições violadas"
          >
            <Switch
              checked={config.alertasConflito}
              onCheckedChange={() => toggle("alertasConflito")}
            />
          </SettingRow>

          <SettingRow
            label="Permitir substituições urgentes"
            description="Permite atribuir auxiliares indisponíveis em situações de emergência"
          >
            <Switch
              checked={config.permitirSubstituicoes}
              onCheckedChange={() => toggle("permitirSubstituicoes")}
            />
          </SettingRow>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          {saved ? <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Guardado!</> : "Guardar alterações"}
        </Button>
      </div>
    </div>
  )
}

// ─── Sistema Tab ─────────────────────────────────────────────────────────────

function TabSistema({ onCheckSystem }: { onCheckSystem: () => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Hospital className="h-5 w-5 text-primary-600" />
            <CardTitle className="text-base">Aplicação</CardTitle>
          </div>
          <CardDescription>Informações gerais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[
            ["Nome", "HospitalEscalas"],
            ["Versão", "1.0.0"],
            ["Stack", "React 19 + Supabase"],
            ["Build", "Vite 7"],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium">{val}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary-600" />
            <CardTitle className="text-base">Base de Dados</CardTitle>
          </div>
          <CardDescription>Supabase (PostgreSQL)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Projeto</span>
            <span className="font-medium text-xs font-mono truncate max-w-[150px]">
              {import.meta.env.VITE_SUPABASE_URL?.split("//")[1]?.split(".")[0] ?? "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Estado</span>
            <span className="inline-flex items-center gap-1 text-green-700 font-medium">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Ligado
            </span>
          </div>
          <Separator />
          <Button size="sm" variant="outline" className="w-full" onClick={onCheckSystem}>
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            Verificar sistema
          </Button>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary-600" />
            <CardTitle className="text-base">Módulos Disponíveis</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-gray-600">
            {[
              { label: "Horário Mensal",         icon: CalendarDays },
              { label: "Horário Semanal",        icon: CalendarDays },
              { label: "Gestão de Auxiliares",   icon: Users },
              { label: "Gestão de Turnos",       icon: Clock },
              { label: "Gestão de Doutores",     icon: Stethoscope },
              { label: "Restrições de Horários", icon: ShieldCheck },
              { label: "Export PDF",             icon: Info },
              { label: "Partilha WhatsApp",      icon: Info },
            ].map(({ label, icon: Icon }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-primary-500 shrink-0" />
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
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500 mt-1">Gerir empresa, regras de horários e sistema</p>
        </div>
        <Button variant="outline" onClick={() => setCheckOpen(true)}>
          <Settings2 className="h-4 w-4 mr-1.5" />
          Verificar Sistema
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="empresa">
        <TabsList className="mb-2 w-full sm:w-auto">
          <TabsTrigger value="empresa">
            <Building2 className="h-3.5 w-3.5 mr-1.5" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="horarios">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Horários
          </TabsTrigger>
          <TabsTrigger value="sistema">
            <Database className="h-3.5 w-3.5 mr-1.5" />
            Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <TabEmpresa />
        </TabsContent>
        <TabsContent value="horarios">
          <TabHorarios />
        </TabsContent>
        <TabsContent value="sistema">
          <TabSistema onCheckSystem={() => setCheckOpen(true)} />
        </TabsContent>
      </Tabs>

      {/* System check dialog */}
      <SystemCheckModal open={checkOpen} onClose={() => setCheckOpen(false)} />
    </div>
  )
}
