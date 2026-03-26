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

export interface SaveResult { success: boolean; error?: string }

interface ConfigContextValue {
  empresa: EmpresaConfig
  horarios: HorariosConfig
  perfil: PerfilCoordenador
  loadingConfig: boolean
  saveEmpresa: (c: EmpresaConfig) => Promise<SaveResult>
  saveHorarios: (c: HorariosConfig) => Promise<SaveResult>
  savePerfil: (p: PerfilCoordenador) => Promise<SaveResult>
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

  async function saveEmpresa(c: EmpresaConfig): Promise<SaveResult> {
    const prev = empresa
    setEmpresa(c)
    try {
      const { error } = await supabase
        .from("configuracoes")
        .upsert({ chave: "empresa", valor: JSON.parse(JSON.stringify(c)), updated_at: new Date().toISOString() })
      if (error) { setEmpresa(prev); return { success: false, error: error.message } }
      return { success: true }
    } catch (err: unknown) {
      setEmpresa(prev)
      return { success: false, error: err instanceof Error ? err.message : "Erro desconhecido" }
    }
  }

  async function saveHorarios(c: HorariosConfig): Promise<SaveResult> {
    const prev = horarios
    setHorarios(c)
    try {
      const { error } = await supabase
        .from("configuracoes")
        .upsert({ chave: "horarios", valor: JSON.parse(JSON.stringify(c)), updated_at: new Date().toISOString() })
      if (error) { setHorarios(prev); return { success: false, error: error.message } }
      return { success: true }
    } catch (err: unknown) {
      setHorarios(prev)
      return { success: false, error: err instanceof Error ? err.message : "Erro desconhecido" }
    }
  }

  async function savePerfil(p: PerfilCoordenador): Promise<SaveResult> {
    if (!user?.id) return { success: false, error: "Utilizador não autenticado" }
    const prev = perfil
    setPerfil(p)
    try {
      const { error } = await supabase
        .from("perfil_coordenador")
        .upsert({
          user_id: user.id,
          nome: p.nome,
          telemovel: p.telemovel,
          numero_mecanografico: p.numero_mecanografico,
          foto: p.foto,
          updated_at: new Date().toISOString(),
        })
      if (error) { setPerfil(prev); return { success: false, error: error.message } }
      return { success: true }
    } catch (err: unknown) {
      setPerfil(prev)
      return { success: false, error: err instanceof Error ? err.message : "Erro desconhecido" }
    }
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
