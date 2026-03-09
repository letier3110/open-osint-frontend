import { useState, useEffect } from 'react'

const SYSTEM_PROMPT = `You are an eligibility screener for a European defence technology hackathon. Your job is to determine if an applicant is eligible based on strict sanctions and regulatory rules.

INELIGIBLE COUNTRIES (citizenship OR residency = INELIGIBLE, regardless of current location or dual citizenship):
Russia, Belarus, North Korea (DPRK), Iran (Islamic Republic of Iran), China (People's Republic of China), Syria, Cuba, Venezuela, Sudan

INELIGIBLE REGIONS (any stated connection or affiliation = INELIGIBLE):
Crimea (Ukraine), Donetsk (Ukraine), Luhansk (Ukraine), Transnistria (Moldova), Abkhazia (Georgia), South Ossetia (Georgia), Gaza Strip

RULES:
- Dual citizenship: if ANY citizenship matches ineligible list → INELIGIBLE
- Current location does not override citizenship or nationality
- Any mention of ineligible regions as home, affiliation, or employer location → INELIGIBLE

WHAT TO CROSS-CHECK:
1. Application fields (country of origin, nationality, reason) against the ineligible list
2. LinkedIn profile for: current/past location in ineligible country, employer or university in ineligible country, profile language (Cyrillic/Simplified Chinese/Farsi/Korean as primary script), any mention of ineligible regions, account authenticity signals
3. Conflicts between application form and LinkedIn data

RESPOND IN THIS EXACT JSON FORMAT ONLY. No other text:
{
  "verdict": "ELIGIBLE" | "INELIGIBLE" | "MANUAL REVIEW",
  "reason": "One clear sentence explaining the verdict",
  "flags": [
    { "source": "APPLICATION" | "LINKEDIN" | "CONFLICT", "finding": "description" }
  ],
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "detail": "2-3 sentences of additional context for the reviewer"
}

If no flags, return flags as empty array [].`

interface ScreeningResult {
  verdict: 'ELIGIBLE' | 'INELIGIBLE' | 'MANUAL REVIEW'
  reason: string
  flags: { source: 'APPLICATION' | 'LINKEDIN' | 'CONFLICT'; finding: string }[]
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  detail?: string
}

function buildUserMessage(country: string, nationality: string, reason: string, linkedin: string): string {
  return `APPLICATION DATA:
Country of origin: ${country || 'Not provided'}
Nationality: ${nationality || 'Not provided'}
Reason for participation: ${reason || 'Not provided'}

LINKEDIN PROFILE TEXT:
${linkedin || 'Not provided'}`
}

export default function App() {
  const [country, setCountry] = useState('')
  const [nationality, setNationality] = useState('')
  const [reason, setReason] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [result, setResult] = useState<ScreeningResult | null>(null)

  const [inputPrompt, setInputPrompt] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanLine, setScanLine] = useState(0)

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => setScanLine((l) => (l + 1) % 100), 20)
    return () => clearInterval(interval)
  }, [loading])

  async function handleScreen() {
    if (!linkedin.trim() && !country.trim() && !nationality.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const body = JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserMessage(country, nationality, reason, linkedin) }]
      })
      setInputPrompt(body)
      setResult({
        verdict: 'MANUAL REVIEW',
        reason: 'Defaulting to manual review while processing the screening.',
        flags: [],
        confidence: 'LOW',
        detail: 'This is a fallback result. The actual screening result will be updated shortly.'
      })
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setResult(parsed)
    } catch (e: unknown) {
      setError('Screening failed. Check inputs and try again.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setResult(null)
    setError(null)
    setCountry('')
    setNationality('')
    setReason('')
    setLinkedin('')
  }

  const verdictConfig = {
    ELIGIBLE: { color: '#00E5A0', bg: 'rgba(0,229,160,0.08)', label: 'ELIGIBLE', icon: '◉' },
    INELIGIBLE: { color: '#FF3B3B', bg: 'rgba(255,59,59,0.08)', label: 'INELIGIBLE', icon: '⊗' },
    'MANUAL REVIEW': { color: '#FFB830', bg: 'rgba(255,184,48,0.08)', label: 'MANUAL REVIEW', icon: '◈' }
  }

  const vc = result ? verdictConfig[result.verdict] || verdictConfig['MANUAL REVIEW'] : null

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080C14',
        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
        color: '#C8D8E8',
        padding: '0',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Grid background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          backgroundImage:
            'linear-gradient(rgba(30,60,100,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(30,60,100,0.15) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Scan line when loading */}
      {loading && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            zIndex: 100,
            pointerEvents: 'none',
            top: `${scanLine}%`,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #1E90FF, #00E5A0, transparent)',
            boxShadow: '0 0 20px #1E90FF',
            transition: 'top 0.02s linear'
          }}
        />
      )}

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 24px', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 36, borderBottom: '1px solid rgba(30,144,255,0.2)', paddingBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#00E5A0',
                boxShadow: '0 0 10px #00E5A0',
                animation: 'pulse 2s infinite'
              }}
            />
            <span style={{ fontSize: 11, letterSpacing: 4, color: '#1E90FF', textTransform: 'uppercase' }}>
              EDTH Porto 2025
            </span>
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: 0,
              letterSpacing: 2,
              color: '#EEF4FF',
              textTransform: 'uppercase'
            }}
          >
            Participant Eligibility Screener
          </h1>
          <p style={{ fontSize: 12, color: '#607080', marginTop: 6, letterSpacing: 1 }}>
            Sanctions & Regulatory Compliance Check · Internal Use Only
          </p>
        </div>

        {!result ? (
          <>
            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label='Country of Origin' value={country} onChange={setCountry} placeholder='e.g. Germany' />
                <Field
                  label='Nationality'
                  value={nationality}
                  onChange={setNationality}
                  placeholder='e.g. German (or dual)'
                />
              </div>

              <Field
                label='Reason for Participation'
                value={reason}
                onChange={setReason}
                placeholder='As stated in the application form...'
                multiline
                rows={3}
              />

              <Field
                label='LinkedIn Profile Text'
                value={linkedin}
                onChange={setLinkedin}
                placeholder={'Go to their LinkedIn profile → Select All (Ctrl+A / Cmd+A) → Copy → Paste here'}
                multiline
                rows={12}
              />

              {error && (
                <div
                  style={{
                    color: '#FF3B3B',
                    fontSize: 12,
                    letterSpacing: 1,
                    padding: '10px 14px',
                    border: '1px solid rgba(255,59,59,0.3)',
                    borderRadius: 4,
                    background: 'rgba(255,59,59,0.05)'
                  }}
                >
                  ⚠ {error}
                </div>
              )}

              <button
                onClick={handleScreen}
                disabled={loading || (!linkedin.trim() && !country.trim())}
                style={{
                  padding: '14px 28px',
                  background: loading ? 'rgba(30,144,255,0.1)' : 'rgba(30,144,255,0.15)',
                  border: '1px solid',
                  borderColor: loading ? 'rgba(30,144,255,0.3)' : '#1E90FF',
                  color: loading ? '#607080' : '#EEF4FF',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  borderRadius: 4,
                  transition: 'all 0.2s',
                  boxShadow: loading ? 'none' : '0 0 20px rgba(30,144,255,0.15)'
                }}
              >
                {loading ? '◌  Screening...' : '▶  Run Eligibility Check'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Result */}
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              {/* Verdict block */}
              <div
                style={{
                  padding: '28px 28px',
                  border: `1px solid ${vc?.color}40`,
                  borderRadius: 6,
                  background: vc?.bg,
                  marginBottom: 24,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: vc?.color,
                    opacity: 0.6
                  }}
                />
                <div style={{ fontSize: 11, letterSpacing: 4, color: vc?.color, marginBottom: 12, opacity: 0.8 }}>
                  VERDICT
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <span style={{ fontSize: 36, color: vc?.color, lineHeight: 1 }}>{vc?.icon}</span>
                  <span style={{ fontSize: 28, fontWeight: 700, color: vc?.color, letterSpacing: 3 }}>{vc?.label}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 10,
                      letterSpacing: 2,
                      color:
                        result.confidence === 'HIGH'
                          ? '#00E5A0'
                          : result.confidence === 'MEDIUM'
                            ? '#FFB830'
                            : '#FF3B3B',
                      border: `1px solid currentColor`,
                      padding: '3px 8px',
                      borderRadius: 3,
                      opacity: 0.8
                    }}
                  >
                    {result.confidence} CONFIDENCE
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: '#C8D8E8', lineHeight: 1.6, letterSpacing: 0.5 }}>
                  {result.reason}
                </p>
              </div>

              {/* Flags */}
              {result.flags && result.flags.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, letterSpacing: 4, color: '#607080', marginBottom: 10 }}>
                    FLAGS TRIGGERED
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.flags.map((f, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 12,
                          alignItems: 'flex-start',
                          padding: '10px 14px',
                          borderRadius: 4,
                          background: 'rgba(255,59,59,0.05)',
                          border: '1px solid rgba(255,59,59,0.15)'
                        }}
                      >
                        <span
                          style={{
                            fontSize: 9,
                            letterSpacing: 2,
                            color: '#FF3B3B',
                            border: '1px solid rgba(255,59,59,0.4)',
                            borderRadius: 3,
                            padding: '2px 6px',
                            whiteSpace: 'nowrap',
                            marginTop: 1
                          }}
                        >
                          {f.source}
                        </span>
                        <span style={{ fontSize: 13, color: '#C8D8E8', lineHeight: 1.5 }}>{f.finding}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.flags && result.flags.length === 0 && (
                <div
                  style={{
                    marginBottom: 20,
                    padding: '10px 14px',
                    borderRadius: 4,
                    background: 'rgba(0,229,160,0.05)',
                    border: '1px solid rgba(0,229,160,0.15)',
                    fontSize: 13,
                    color: '#00E5A080',
                    letterSpacing: 1
                  }}
                >
                  ◎ No flags triggered
                </div>
              )}

              {/* Detail */}
              {result.detail && (
                <div
                  style={{
                    padding: '16px 18px',
                    borderRadius: 4,
                    background: 'rgba(30,144,255,0.05)',
                    border: '1px solid rgba(30,144,255,0.15)',
                    marginBottom: 24
                  }}
                >
                  <div style={{ fontSize: 10, letterSpacing: 4, color: '#1E90FF', marginBottom: 8 }}>
                    REVIEWER NOTES
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: '#9BAEC0', lineHeight: 1.7 }}>{result.detail}</p>
                </div>
              )}

              {/* Input prompt */}
              <details style={{ marginBottom: 24, fontSize: 12, color: '#607080' }}>
                <summary style={{ cursor: 'pointer', color: '#1E90FF', letterSpacing: 2 }}>
                  View AI Input Prompt
                </summary>
                <pre
                  style={{
                    marginTop: 12,
                    padding: '16px',
                    background: 'rgba(20,35,55,0.6)',
                    border: '1px solid rgba(30,144,255,0.2)',
                    borderRadius: 4,
                    color: '#C8D8E8',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11,
                    overflowX: 'auto'
                  }}
                >
                  {inputPrompt || SYSTEM_PROMPT + '\n\n' + buildUserMessage(country, nationality, reason, linkedin)}
                </pre>
              </details>

              {/* Reset button */}

              <button
                onClick={reset}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  border: '1px solid rgba(200,216,232,0.2)',
                  color: '#607080',
                  fontSize: 12,
                  fontFamily: 'inherit',
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  borderRadius: 4
                }}
              >
                ← Screen Another Applicant
              </button>
            </div>
          </>
        )}

        <div style={{ marginTop: 40, fontSize: 10, color: '#2A3A4A', letterSpacing: 2, textAlign: 'center' }}>
          EDTH · ANY KEY STUDIO · INTERNAL USE ONLY
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        textarea, input { outline: none; }
        textarea:focus, input:focus { border-color: rgba(30,144,255,0.6) !important; box-shadow: 0 0 0 1px rgba(30,144,255,0.2); }
        button:hover:not(:disabled) { background: rgba(30,144,255,0.25) !important; }
      `}</style>
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
  rows?: number
}

function Field({ label, value, onChange, placeholder, multiline, rows }: FieldProps) {
  const shared = {
    width: '100%',
    background: 'rgba(20,35,55,0.6)',
    border: '1px solid rgba(30,144,255,0.2)',
    borderRadius: 4,
    color: '#C8D8E8',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 13,
    padding: '12px 14px',
    // resize: multiline ? "vertical" : "none",
    transition: 'border-color 0.2s'
  }
  return (
    <div>
      <label
        style={{
          fontSize: 10,
          letterSpacing: 3,
          color: '#1E90FF',
          display: 'block',
          marginBottom: 8,
          textTransform: 'uppercase'
        }}
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            ...shared,
            lineHeight: 1.6

            // placeholderColor: "#2A3A4A"
          }}
        />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={shared} />
      )}
    </div>
  )
}
