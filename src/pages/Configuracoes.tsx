import { Hospital, Database, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function Configuracoes() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">Informações do sistema</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Hospital className="h-5 w-5 text-primary-600" />
              <CardTitle className="text-base">Sistema</CardTitle>
            </div>
            <CardDescription>Informações gerais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Nome</span>
              <span className="font-medium">HospitalEscalas</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Versão</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Stack</span>
              <span className="font-medium">React + Supabase</span>
            </div>
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
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">URL</span>
              <span className="font-medium text-xs truncate max-w-[150px]">rijonndemwuxihrzzmru</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Estado</span>
              <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Ligado
              </span>
            </div>
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
            <ul className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              {[
                "Horário Mensal",
                "Horário Semanal",
                "Gestão de Auxiliares",
                "Gestão de Turnos",
                "Gestão de Doutores",
                "Restrições de Horários",
                "Export PDF",
                "Partilha WhatsApp",
              ].map((m) => (
                <li key={m} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full" />
                  {m}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
