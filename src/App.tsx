import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { ConfigProvider } from "@/contexts/ConfigContext"
import Layout from "@/components/layout/Layout"
import Login from "@/pages/Login"
import Auxiliares from "@/pages/Auxiliares"
import Doutores from "@/pages/Doutores"
import Turnos from "@/pages/Turnos"
import Restricoes from "@/pages/Restricoes"
import EscalaSemanal from "@/pages/EscalaSemanal"
import EscalaMensal from "@/pages/EscalaMensal"
import Configuracoes from "@/pages/Configuracoes"
import VincularTurnoPosto from "@/pages/VincularTurnoPosto"

// ─── Loading screen while session resolves ───────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "#040d1a",
    }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(0,158,208,0.7)" strokeWidth="2.5" strokeLinecap="round"
        style={{ animation: "spin 0.8s linear infinite" }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Guard: redirect to /login if not authenticated ──────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ─── Guard: redirect to app if already logged in ─────────────────────────────
function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (session) return <Navigate to="/escala-mensal" replace />
  return <>{children}</>
}

// ─── Routes ──────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <Login />
          </RedirectIfAuthed>
        }
      />

      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/escala-mensal" replace />} />
        <Route path="escala-mensal" element={<EscalaMensal />} />
        <Route path="escala-semanal" element={<EscalaSemanal />} />
        <Route path="auxiliares" element={<Auxiliares />} />
        <Route path="turnos" element={<Turnos />} />
        <Route path="turno-postos" element={<VincularTurnoPosto />} />
        <Route path="doutores" element={<Doutores />} />
        <Route path="restricoes" element={<Restricoes />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConfigProvider>
          <AppRoutes />
        </ConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
