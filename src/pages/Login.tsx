import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"

// ─── Animated background mesh ─────────────────────────────────────────────────
function MeshBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(135deg, #040d1a 0%, #071428 40%, #0a1f3d 70%, #061630 100%)",
      }} />
      <div style={{
        position: "absolute",
        top: "-20%",
        left: "-10%",
        width: "70%",
        height: "70%",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,83,155,0.35) 0%, transparent 70%)",
        animation: "orbFloat1 12s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute",
        bottom: "-15%",
        right: "-5%",
        width: "60%",
        height: "60%",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,143,200,0.2) 0%, transparent 70%)",
        animation: "orbFloat2 16s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)",
      }} />
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
      }} />

      <style>{`
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(6%, 8%) scale(1.08); }
          66% { transform: translate(-4%, 4%) scale(0.96); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40% { transform: translate(-8%, -6%) scale(1.05); }
          70% { transform: translate(4%, -10%) scale(1.1); }
        }
      `}</style>
    </div>
  )
}

function HospitalCross({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="14" y="4" width="12" height="32" rx="3" fill="white" fillOpacity="0.92" />
      <rect x="4" y="14" width="32" height="12" rx="3" fill="white" fillOpacity="0.92" />
    </svg>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

// ─── Main Login ───────────────────────────────────────────────────────────────
export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    emailRef.current?.focus()
    return () => clearTimeout(t)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(error)
    } else {
      navigate("/", { replace: true })
    }
  }

  return (
    <div className="login-root">

      {/* ── LEFT PANEL: Branding (hidden on mobile) ── */}
      <div
        className="login-left"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "none" : "translateX(-24px)",
          transition: "opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <MeshBackground />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.875rem",
            marginBottom: "3.5rem",
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "rgba(0,143,200,0.25)",
              border: "1px solid rgba(0,143,200,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(8px)",
            }}>
              <HospitalCross size={28} />
            </div>
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(255,255,255,0.85)",
              letterSpacing: "0.04em",
            }}>
              CHL
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(2.4rem, 3.5vw, 3.2rem)",
            fontWeight: 600,
            color: "#ffffff",
            lineHeight: 1.15,
            margin: 0,
            marginBottom: "1rem",
            letterSpacing: "-0.01em",
          }}>
            Gestão de<br />
            <em style={{ fontStyle: "italic", color: "rgba(100,195,240,0.9)" }}>Horários</em><br />
            Imagiologia
          </h1>

          <p style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.65,
            maxWidth: 340,
            margin: 0,
            marginBottom: "3rem",
          }}>
            Unidade Local de Saúde da Região de Leiria, E.P.E.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 32, height: 2, background: "rgba(0,143,200,0.6)", borderRadius: 2 }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(0,143,200,0.4)" }} />
          </div>
        </div>

        {/* Bottom card */}
        <div style={{
          position: "absolute",
          bottom: "2.5rem",
          left: "2.5rem",
          right: "2.5rem",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(4px)",
          padding: "1rem 1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Galeria / Vídeo
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>
              Disponível em breve
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Form ── */}
      <div
        className="login-right"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "none" : "translateY(20px)",
          transition: "opacity 0.8s 0.15s cubic-bezier(0.16,1,0.3,1), transform 0.8s 0.15s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* subtle grid texture */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(0,100,170,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          pointerEvents: "none",
        }} />

        {/* Mobile-only top branding */}
        <div className="login-mobile-brand">
          <MeshBackground />
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(0,143,200,0.3)",
              border: "1px solid rgba(0,143,200,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <HospitalCross size={22} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>CHL</p>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(100,195,240,0.85)", fontFamily: "'DM Sans', sans-serif" }}>Imagiologia · Gestão de Horários</p>
            </div>
          </div>
        </div>

        {/* Form card */}
        <div className="login-form-wrapper">
          <div className="login-card">
            <div style={{ marginBottom: "2rem" }}>
              <p style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#009ed0",
                marginBottom: "0.5rem",
              }}>
                Bem-vindo
              </p>
              <h2 style={{
                margin: 0,
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "1.9rem",
                fontWeight: 600,
                color: "#0f1929",
                lineHeight: 1.2,
              }}>
                Iniciar sessão
              </h2>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: "0.45rem",
                  letterSpacing: "0.02em",
                }}>
                  Email
                </label>
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null) }}
                  placeholder="nome@chl.min-saude.pt"
                  autoComplete="email"
                  required
                  className="login-input"
                  style={{
                    border: `1.5px solid ${error ? "#ef4444" : "#e5e7eb"}`,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#009ed0"
                    e.target.style.boxShadow = "0 0 0 3px rgba(0,158,208,0.12)"
                    e.target.style.background = "#ffffff"
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = error ? "#ef4444" : "#e5e7eb"
                    e.target.style.boxShadow = "none"
                    e.target.style.background = "#f8f9fb"
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: "0.45rem",
                  letterSpacing: "0.02em",
                }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null) }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="login-input"
                    style={{
                      paddingRight: "2.75rem",
                      border: `1.5px solid ${error ? "#ef4444" : "#e5e7eb"}`,
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#009ed0"
                      e.target.style.boxShadow = "0 0 0 3px rgba(0,158,208,0.12)"
                      e.target.style.background = "#ffffff"
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = error ? "#ef4444" : "#e5e7eb"
                      e.target.style.boxShadow = "none"
                      e.target.style.background = "#f8f9fb"
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#9ca3af",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#374151")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
                    tabIndex={-1}
                    aria-label={showPw ? "Ocultar password" : "Mostrar password"}
                  >
                    <EyeIcon open={showPw} />
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.65rem 0.875rem",
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  borderRadius: 8,
                  marginBottom: "1.25rem",
                  animation: "errShake 0.4s cubic-bezier(0.36,0.07,0.19,0.97)",
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span style={{ fontSize: 13, color: "#b91c1c", lineHeight: 1.4 }}>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="login-btn"
                style={{
                  background: loading ? "#6b7280" : "linear-gradient(135deg, #007ab8 0%, #009ed0 100%)",
                  cursor: loading || !email || !password ? "not-allowed" : "pointer",
                  opacity: !email || !password ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading && email && password) {
                    e.currentTarget.style.transform = "translateY(-1px)"
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,122,184,0.4)"
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none"
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,122,184,0.3)"
                }}
              >
                {loading ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    A autenticar...
                  </>
                ) : (
                  "Entrar"
                )}
              </button>
            </form>
          </div>

          <p style={{
            textAlign: "center",
            marginTop: "1.5rem",
            fontSize: 12,
            color: "#9ca3af",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            CHL · Serviço de Imagiologia · Acesso restrito
          </p>
        </div>
      </div>

      {/* Global styles */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes errShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }

        .login-root {
          display: flex;
          min-height: 100vh;
          min-height: 100dvh;
          font-family: 'DM Sans', sans-serif;
          flex-direction: row;
        }

        /* LEFT PANEL */
        .login-left {
          flex: 0 0 52%;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 3rem 3.5rem;
          overflow: hidden;
        }

        /* RIGHT PANEL */
        .login-right {
          flex: 1;
          background: #f8f9fb;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .login-mobile-brand {
          display: none;
          position: relative;
          overflow: hidden;
          padding: 1.5rem 1.25rem;
          min-height: 110px;
          align-items: center;
        }

        .login-form-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.25rem;
        }

        .login-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05), 0 20px 60px rgba(0,50,120,0.08);
          border: 1px solid rgba(0,0,0,0.06);
          width: 100%;
          max-width: 400px;
        }

        .login-input {
          width: 100%;
          box-sizing: border-box;
          padding: 0.75rem 1rem;
          font-size: 14px;
          color: #0f1929;
          background: #f8f9fb;
          border-radius: 10px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          font-family: 'DM Sans', sans-serif;
        }

        .login-btn {
          width: 100%;
          padding: 0.8rem;
          font-size: 14px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.02em;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 14px rgba(0,122,184,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        /* ─ MOBILE ─────────────────────────────────── */
        @media (max-width: 768px) {
          .login-root {
            flex-direction: column;
          }

          .login-left {
            display: none;
          }

          .login-right {
            justify-content: flex-start;
            background: #f8f9fb;
          }

          .login-mobile-brand {
            display: flex;
          }

          .login-form-wrapper {
            padding: 1.5rem 1.25rem 2rem;
            justify-content: flex-start;
          }

          .login-card {
            padding: 1.75rem 1.5rem;
            border-radius: 16px;
          }
        }

        /* ─ SMALL PHONES ─────────────────────────────── */
        @media (max-width: 400px) {
          .login-card {
            padding: 1.5rem 1.25rem;
          }
        }
      `}</style>
    </div>
  )
}
