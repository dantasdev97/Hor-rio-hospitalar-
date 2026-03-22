import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/contexts/AuthContext"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmpresaConfig {
  nome: string
  departamento: string
  telefone: string
  email: string
  logo: string | null  // base64
}

export interface HorariosConfig {
  bloquearTurnosConsecutivos: boolean
  horasDescansMinimas: number
  maxTurnosSemana: number
  maxTurnosNoturnos: number
  maxTurnosMes: number
  maxTurnosNoturnosMes: number
  alertasConflito: boolean
  permitirSubstituicoes: boolean
}

export interface PerfilCoordenador {
  nome: string
  telemovel: string
  numero_mecanografico: string
  foto: string | null  // base64
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const defaultEmpresa: EmpresaConfig = {
  nome: "Hospital Leiria CHL",
  departamento: "Imagiologia",
  telefone: "",
  email: "",
  logo: null,
}

export const defaultHorarios: HorariosConfig = {
  bloquearTurnosConsecutivos: true,
  horasDescansMinimas: 11,
  maxTurnosSemana: 5,
  maxTurnosNoturnos: 2,
  alertasConflito: true,
  permitirSubstituicoes: false,
  maxTurnosMes: 22,
  maxTurnosNoturnosMes: 4,
}

const defaultPerfil: PerfilCoordenador = {
  nome: "",
  telemovel: "",
  numero_mecanografico: "",
  foto: null,
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ConfigContextValue {
  empresa: EmpresaConfig
  horarios: HorariosConfig
  perfil: PerfilCoordenador
  loadingConfig: boolean
  saveEmpresa: (c: EmpresaConfig) => Promise<void>
  saveHorarios: (c: HorariosConfig) => Promise<void>
  savePerfil: (p: PerfilCoordenador) => Promise<void>
}

const ConfigContext = createContext<ConfigContextValue | null>(null)

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [empresa, setEmpresa] = useState<EmpresaConfig>(defaultEmpresa)
  const [horarios, setHorarios] = useState<HorariosConfig>(defaultHorarios)
  const [perfil, setPerfil] = useState<PerfilCoordenador>(defaultPerfil)
  const [loadingConfig, setLoadingConfig] = useState(true)

  // Carrega configurações e perfil da BD
  useEffect(() => {
    async function load() {
      setLoadingConfig(true)
      try {
        // Configurações globais (empresa + horarios)
        const { data: rows } = await supabase
          .from("configuracoes")
          .select("chave, valor")

        if (rows) {
          for (const row of rows) {
            if (row.chave === "empresa") {
              setEmpresa({ ...defaultEmpresa, ...(row.valor as Partial<EmpresaConfig>) })
            }
            if (row.chave === "horarios") {
              setHorarios({ ...defaultHorarios, ...(row.valor as Partial<HorariosConfig>) })
            }
          }
        }

        // Perfil do coordenador
        if (user?.id) {
          const { data: perfilRow } = await supabase
            .from("perfil_coordenador")
            .select("nome, telemovel, numero_mecanografico, foto")
            .eq("user_id", user.id)
            .maybeSingle()

          if (perfilRow) {
            setPerfil({ ...defaultPerfil, ...perfilRow })
          }
        }
      } catch {
        // Falha silenciosa — usa defaults
      } finally {
        setLoadingConfig(false)
      }
    }

    load()
  }, [user?.id])

  async function saveEmpresa(c: EmpresaConfig) {
    setEmpresa(c)
    await supabase
      .from("configuracoes")
      .upsert({ chave: "empresa", valor: c as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
  }

  async function saveHorarios(c: HorariosConfig) {
    setHorarios(c)
    await supabase
      .from("configuracoes")
      .upsert({ chave: "horarios", valor: c as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
  }

  async function savePerfil(p: PerfilCoordenador) {
    if (!user?.id) return
    setPerfil(p)
    await supabase
      .from("perfil_coordenador")
      .upsert({
        user_id: user.id,
        nome: p.nome,
        telemovel: p.telemovel,
        numero_mecanografico: p.numero_mecanografico,
        foto: p.foto,
        updated_at: new Date().toISOString(),
      })
  }

  return (
    <ConfigContext.Provider value={{ empresa, horarios, perfil, loadingConfig, saveEmpresa, saveHorarios, savePerfil }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider")
  return ctx
}
