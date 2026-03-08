import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Layout from "@/components/layout/Layout"
import Auxiliares from "@/pages/Auxiliares"
import Doutores from "@/pages/Doutores"
import Turnos from "@/pages/Turnos"
import Restricoes from "@/pages/Restricoes"
import EscalaSemanal from "@/pages/EscalaSemanal"
import EscalaMensal from "@/pages/EscalaMensal"
import Configuracoes from "@/pages/Configuracoes"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/escala-mensal" replace />} />
          <Route path="escala-mensal" element={<EscalaMensal />} />
          <Route path="escala-semanal" element={<EscalaSemanal />} />
          <Route path="auxiliares" element={<Auxiliares />} />
          <Route path="turnos" element={<Turnos />} />
          <Route path="doutores" element={<Doutores />} />
          <Route path="restricoes" element={<Restricoes />} />
          <Route path="configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
