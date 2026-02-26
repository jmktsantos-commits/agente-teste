"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

function ActivateTrialContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const partnerRef = searchParams.get("ref") || localStorage.getItem("trial_ref") || "GENERIC"
    const autoActivate = searchParams.get("auto") === "true"

    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<"idle" | "success" | "error" | "already_active">("idle")
    const [message, setMessage] = useState("")
    const [user, setUser] = useState<{ email: string; name: string } | null>(null)

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setUser({
                    email: data.user.email || "",
                    name: data.user.user_metadata?.full_name || "usuário"
                })
                // Auto-ativar se vier do link de confirmação de email
                if (autoActivate) {
                    handleActivate(partnerRef)
                }
            }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleActivate = async (partnerRefOverride?: string) => {
        setLoading(true)
        try {
            const ref = partnerRefOverride || partnerRef
            const res = await fetch("/api/trial/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ partner_ref: ref })
            })
            const data = await res.json()

            if (res.ok) {
                setStatus("success")
                localStorage.removeItem("activate_trial")
                localStorage.removeItem("trial_ref")
                setTimeout(() => router.push("/dashboard"), 2000)
            } else if (data.error?.includes("já está ativo")) {
                setStatus("already_active")
                setMessage(data.error)
                setTimeout(() => router.push("/dashboard"), 2000)
            } else {
                setStatus("error")
                setMessage(data.error || "Erro ao ativar o trial")
            }
        } catch {
            setStatus("error")
            setMessage("Erro de conexão. Tente novamente.")
        } finally {
            setLoading(false)
        }
    }

    const benefits = [
        { icon: "📊", text: "Previsões de multiplicadores em tempo real" },
        { icon: "🤖", text: "Análises com Inteligência Artificial" },
        { icon: "📈", text: "Histórico completo de resultados" },
        { icon: "🔴", text: "Acesso a lives exclusivas com experts" },
        { icon: "💬", text: "Chat com a comunidade VIP" },
    ]

    return (
        <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-lg">
                {/* Card principal */}
                <div className="bg-[#111118] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-6 text-center">
                        <div className="text-4xl mb-2">🎁</div>
                        <h1 className="text-2xl font-bold text-white">Acesso Gratuito por 24h</h1>
                        <p className="text-emerald-100 text-sm mt-1">Sem cartão de crédito. Sem compromisso.</p>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Contador visual */}
                        <div className="flex items-center justify-center gap-4">
                            {["24", ":", "00", ":", "00"].map((seg, i) => (
                                <div key={i} className={seg === ":" ? "text-gray-400 text-2xl font-bold" : "bg-[#1a1a25] border border-white/10 rounded-xl p-3 text-center min-w-[60px]"}>
                                    {seg === ":" ? ":" : (
                                        <>
                                            <div className="text-2xl font-bold text-emerald-400">{seg}</div>
                                            <div className="text-xs text-gray-500">{i === 0 ? "horas" : i === 2 ? "min" : "seg"}</div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Benefícios */}
                        <div className="space-y-3">
                            <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">O que você terá acesso:</p>
                            {benefits.map((b, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-lg">{b.icon}</span>
                                    <span className="text-sm text-gray-300">{b.icon && b.text}</span>
                                </div>
                            ))}
                        </div>

                        {/* Status messages */}
                        {status === "success" && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                                <div className="text-2xl mb-1">✅</div>
                                <p className="text-emerald-400 font-semibold">Trial ativado com sucesso!</p>
                                <p className="text-gray-400 text-sm mt-1">Redirecionando para o dashboard...</p>
                            </div>
                        )}
                        {status === "error" && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                                <p className="text-red-400 text-sm">{message}</p>
                            </div>
                        )}
                        {status === "already_active" && (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                                <p className="text-blue-400 text-sm">Trial já está ativo! Redirecionando...</p>
                            </div>
                        )}

                        {/* CTA */}
                        {status === "idle" || status === "error" ? (
                            !user ? (
                                <div className="space-y-3">
                                    <a
                                        href={`/registro?ref=${partnerRef}&trial=true`}
                                        className="block w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-4 rounded-xl text-center transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-500/25"
                                    >
                                        🚀 Criar conta e ativar trial gratuito
                                    </a>
                                    <p className="text-center text-xs text-gray-500">
                                        Já tem conta?{" "}
                                        <a href={`/login?redirect=/ativar-trial?ref=${partnerRef}`} className="text-emerald-400 hover:underline">
                                            Entrar e ativar
                                        </a>
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-center text-sm text-gray-400">
                                        Logado como <span className="text-white">{user.email}</span>
                                    </p>
                                    <button
                                        onClick={() => handleActivate()}
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-500/25"
                                    >
                                        {loading ? "Ativando..." : "🎁 Ativar meu trial de 24h gratuito"}
                                    </button>
                                </div>
                            )
                        ) : null}

                        {partnerRef !== "GENERIC" && (
                            <p className="text-center text-xs text-gray-600">
                                Parceria: <span className="text-gray-500">{partnerRef}</span>
                            </p>
                        )}
                    </div>
                </div>

                <p className="text-center text-xs text-gray-600 mt-4">
                    Ao ativar, você concorda com nossos Termos de Uso. Nenhum pagamento é necessário.
                </p>
            </div>
        </main>
    )
}

export default function ActivateTrialPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><p className="text-gray-400">Carregando...</p></div>}>
            <ActivateTrialContent />
        </Suspense>
    )
}
