import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { Auxiliar, EquipaType } from "@/types"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const EQUIPAS: EquipaType[] = ['Equipa 1', 'Equipa 2', 'Equipa Transportes']

export default function AuxiliaresPorEquipa() {
  const [auxiliares, setAuxiliares] = useState<Auxiliar[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchAuxiliares() {
    setLoading(true)
    const { data } = await supabase.from("auxiliares").select("*").order("nome")
    setAuxiliares(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAuxiliares() }, [])

  // Agrupar auxiliares por equipe
  const equipas = {
    'Equipa 1': auxiliares.filter(a => a.equipa === 'Equipa 1'),
    'Equipa 2': auxiliares.filter(a => a.equipa === 'Equipa 2'),
    'Equipa Transportes': auxiliares.filter(a => a.equipa === 'Equipa Transportes'),
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Auxiliares por Equipa</h1>
        <p className="text-sm text-gray-500 mt-1">
          Visualização de auxiliares organizados por equipe
        </p>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">A carregar...</div>
      ) : (
        <div className="space-y-8">
          {EQUIPAS.map((nomeEquipa) => {
            const membros = equipas[nomeEquipa]

            return (
              <div key={nomeEquipa}>
                {/* Cabeçalho da Equipe */}
                <div className="bg-gray-200 px-4 py-3 rounded-t-lg border-b-2 border-gray-400">
                  <h2 className="text-lg font-bold text-gray-800">
                    {nomeEquipa}
                    <span className="ml-3 text-sm font-normal text-gray-600">
                      ({membros.length} {membros.length === 1 ? 'auxiliar' : 'auxiliares'})
                    </span>
                  </h2>
                </div>

                {/* Tabela da Equipe */}
                <div className="bg-white rounded-b-lg border border-gray-200 shadow-sm overflow-hidden">
                  {membros.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      Nenhum auxiliar nesta equipa.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Nº Mecanográfico</TableHead>
                          <TableHead>Contribuinte</TableHead>
                          <TableHead>Disponível</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {membros.map((aux) => (
                          <TableRow key={aux.id}>
                            <TableCell className="font-medium">{aux.nome}</TableCell>
                            <TableCell className="text-gray-500">{aux.email ?? "-"}</TableCell>
                            <TableCell className="text-gray-500">{aux.numero_mecanografico ?? "-"}</TableCell>
                            <TableCell className="text-gray-500">{aux.contribuinte ?? "-"}</TableCell>
                            <TableCell>
                              <Badge variant={aux.disponivel ? "success" : "destructive"}>
                                {aux.disponivel ? "Disponível" : "Indisponível"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            )
          })}

          {auxiliares.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-gray-400">
              Nenhum auxiliar cadastrado. Vá para a página "Auxiliares" para adicionar.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
