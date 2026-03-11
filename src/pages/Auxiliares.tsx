import { useEffect, useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, Search, X, Users, UserCheck, UserX, Moon } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import type { Auxiliar } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { AuxDrawer } from "@/components/AuxDrawer"

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").or(z.literal("")),
  numero_mecanografico: z.string().optional(),
  contribuinte: z.string().optional(),
})
type FormData = z.infer<typeof schema>
type FilterMode = "all" | "available" | "unavailable"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[1,2,3,4].map(i => (
        <TableRow key={i}>
          <TableCell><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse shrink-0"/><div className="h-4 w-32 rounded bg-gray-200 animate-pulse"/></div></TableCell>
          <TableCell><div className="h-4 w-40 rounded bg-gray-200 animate-pulse"/></TableCell>
          <TableCell><div className="h-4 w-20 rounded bg-gray-200 animate-pulse"/></TableCell>
          <TableCell><div className="h-4 w-24 rounded bg-gray-200 animate-pulse"/></TableCell>
          <TableCell><div className="h-5 w-24 rounded-full bg-gray-200 animate-pulse"/></TableCell>
          <TableCell><div className="h-5 w-16 rounded-full bg-gray-200 animate-pulse"/></TableCell>
          <TableCell className="text-right"><div className="flex items-center justify-end gap-2"><div className="h-8 w-8 rounded bg-gray-200 animate-pulse"/><div className="h-8 w-8 rounded bg-gray-200 animate-pulse"/></div></TableCell>
        </TableRow>
      ))}
    </>
  )
}

function StatPill({ icon:Icon, label, value, colorClass }: { icon:React.ElementType; label:string; value:number; colorClass:string }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${colorClass}`}>
      <Icon className="h-3.5 w-3.5"/>
      <span>{value} {label}</span>
    </div>
  )
}

function AvatarInitial({ nome }: { nome:string }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-700 text-sm font-semibold shrink-0">
      {nome.charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Auxiliares() {
  const [auxiliares, setAuxiliares]   = useState<Auxiliar[]>([])
  const [loading, setLoading]         = useState(true)
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [editing, setEditing]         = useState<Auxiliar | null>(null)
  const [search, setSearch]           = useState("")
  const [filter, setFilter]           = useState<FilterMode>("all")
  const [drawerAux, setDrawerAux]     = useState<Auxiliar | null>(null)

  const { register, handleSubmit, reset, formState:{ errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function fetchAuxiliares() {
    setLoading(true)
    const { data } = await supabase.from("auxiliares").select("*").order("nome")
    setAuxiliares(data ?? [])
    setLoading(false)
  }
  useEffect(() => { fetchAuxiliares() }, [])

  function openNew() {
    setEditing(null)
    reset({ nome:"", email:"", numero_mecanografico:"", contribuinte:"" })
    setDialogOpen(true)
  }
  function openEdit(aux: Auxiliar) {
    setEditing(aux)
    reset({ nome:aux.nome, email:aux.email??"", numero_mecanografico:aux.numero_mecanografico??"", contribuinte:aux.contribuinte??"" })
    setDialogOpen(true)
  }

  async function onSubmit(data: FormData) {
    const payload = { nome:data.nome, email:data.email||null, numero_mecanografico:data.numero_mecanografico||null, contribuinte:data.contribuinte||null }
    if (editing) await supabase.from("auxiliares").update(payload).eq("id",editing.id)
    else         await supabase.from("auxiliares").insert(payload)
    setDialogOpen(false)
    fetchAuxiliares()
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar este auxiliar?")) return
    await supabase.from("auxiliares").delete().eq("id",id)
    if (drawerAux?.id === id) setDrawerAux(null)
    fetchAuxiliares()
  }

  async function toggleDisponivel(aux: Auxiliar) {
    await supabase.from("auxiliares").update({ disponivel:!aux.disponivel }).eq("id",aux.id)
    fetchAuxiliares()
  }

  function handleAuxUpdated(updated: Auxiliar) {
    setAuxiliares(p => p.map(a => a.id===updated.id ? updated : a))
    setDrawerAux(updated)
  }

  const totalDisp   = auxiliares.filter(a => a.disponivel).length
  const totalIndisp = auxiliares.filter(a => !a.disponivel).length

  const filtered = useMemo(() => {
    let list = auxiliares
    if (search.trim()) { const q=search.toLowerCase(); list=list.filter(a=>a.nome.toLowerCase().includes(q)) }
    if (filter==="available")   list=list.filter(a=>a.disponivel)
    if (filter==="unavailable") list=list.filter(a=>!a.disponivel)
    return list
  }, [auxiliares, search, filter])

  const filterOptions: { value:FilterMode; label:string }[] = [
    { value:"all", label:"Todos" },
    { value:"available", label:"Disponíveis" },
    { value:"unavailable", label:"Indisponíveis" },
  ]

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auxiliares</h1>
          <p className="text-sm text-gray-500 mt-1">Gestão de auxiliares de saúde</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!loading && auxiliares.length > 0 && (
            <>
              <StatPill icon={UserCheck} label={totalDisp===1?"disponível":"disponíveis"} value={totalDisp} colorClass="bg-green-50 text-green-700"/>
              <StatPill icon={UserX}    label={totalIndisp===1?"indisponível":"indisponíveis"} value={totalIndisp} colorClass="bg-red-50 text-red-700"/>
            </>
          )}
          <Button onClick={openNew}><Plus className="h-4 w-4"/>Adicionar Auxiliar</Button>
        </div>
      </div>

      {/* ── Search & Filter ── */}
      {!loading && auxiliares.length > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"/>
            <Input className="pl-9 pr-9" placeholder="Pesquisar auxiliar..." value={search} onChange={e=>setSearch(e.target.value)}/>
            {search && (
              <button onClick={()=>setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-4 w-4"/>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-1 shrink-0">
            {filterOptions.map(opt => (
              <button key={opt.value} onClick={()=>setFilter(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter===opt.value?"bg-white text-gray-900 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead><TableHead>Email</TableHead>
              <TableHead>Nº Mec.</TableHead><TableHead>Contribuinte</TableHead>
              <TableHead>Disponível</TableHead><TableHead>FDS</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody><SkeletonRows/></TableBody>
          </Table>
        ) : auxiliares.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4"><Users className="h-8 w-8 text-gray-400"/></div>
            <p className="text-gray-600 font-medium">Nenhum auxiliar cadastrado</p>
            <p className="text-sm text-gray-400 mt-1">Clique em "Adicionar Auxiliar" para começar.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4"><Search className="h-8 w-8 text-gray-400"/></div>
            <p className="text-gray-600 font-medium">
              {search ? `Nenhum resultado para "${search}"` : "Nenhum auxiliar corresponde ao filtro"}
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={()=>{setSearch("");setFilter("all")}}>
              Limpar filtros
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead><TableHead>Email</TableHead>
              <TableHead>Nº Mec.</TableHead><TableHead>Contribuinte</TableHead>
              <TableHead>Disponível</TableHead><TableHead>FDS</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(aux => (
                <TableRow key={aux.id} className="hover:bg-gray-50/60">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <AvatarInitial nome={aux.nome}/>
                      <button
                        onClick={() => setDrawerAux(aux)}
                        className="font-medium text-gray-900 hover:text-blue-600 hover:underline transition-colors text-left">
                        {aux.nome}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500">{aux.email??"-"}</TableCell>
                  <TableCell className="text-gray-500">{aux.numero_mecanografico??"-"}</TableCell>
                  <TableCell className="text-gray-500">{aux.contribuinte??"-"}</TableCell>
                  <TableCell>
                    <button onClick={()=>toggleDisponivel(aux)} className="transition-transform hover:scale-105 active:scale-95" title="Alternar disponibilidade">
                      <Badge variant={aux.disponivel?"success":"destructive"}>{aux.disponivel?"Disponível":"Indisponível"}</Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <span style={{
                      display:"inline-flex",alignItems:"center",gap:4,
                      padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:700,
                      background: aux.trabalha_fds ? "#DBEAFE" : "#F3F4F6",
                      color: aux.trabalha_fds ? "#1D4ED8" : "#6B7280",
                    }}>
                      <Moon size={10}/>{aux.trabalha_fds?"Sim":"Não"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={()=>openEdit(aux)} title="Editar"><Pencil className="h-3 w-3"/></Button>
                      <Button size="sm" variant="destructive" onClick={()=>handleDelete(aux.id)} title="Eliminar"><Trash2 className="h-3 w-3"/></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Edit/Add Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing?"Editar Auxiliar":"Adicionar Auxiliar"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" {...register("nome")} placeholder="Nome completo"/>
              {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="email@hospital.pt"/>
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numero_mecanografico">Nº Mecanográfico</Label>
              <Input id="numero_mecanografico" {...register("numero_mecanografico")} placeholder="Ex: 12345"/>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contribuinte">NIF / Contribuinte</Label>
              <Input id="contribuinte" {...register("contribuinte")} placeholder="Ex: 123456789"/>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={()=>setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting?"A guardar...":editing?"Guardar":"Adicionar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Drawer ── */}
      {drawerAux && (
        <AuxDrawer
          aux={drawerAux}
          onClose={() => setDrawerAux(null)}
          onUpdated={handleAuxUpdated}
        />
      )}
    </div>
  )
}
