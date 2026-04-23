"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

export default function AguardandoAprovacaoPage() {
    const [email, setEmail] = useState("")
    const [checking, setChecking] = useState(false)
    const [approved, setApproved] = useState(false)

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data }) => {
            if (data.user?.email) setEmail(data.user.email)
        })
    }, [])

    // Verifica se o admin aprovou a conta (polling a cada 15s)
    useEffect(() => {
        const supabase = createClient()
        const check = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: profile } = await supabase
                .from("profiles")
                .select("status, trial_expires_at")
                .eq("id", user.id)
                .single()

            if (profile?.status === "active" && profile?.trial_expires_at) {
                setApproved(true)
                setTimeout(() => window.location.href = "/dashboard", 2000)
            }
        }
        check()
        const interval = setInterval(check, 15000)
        return () => clearInterval(interval)
    }, [])

    return (
        <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-500/8 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-500/6 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md text-center space-y-6">
                {approved ? (
                    <div className="space-y-4">
                        <div className="text-6xl animate-bounce">🎉</div>
                        <h1 className="text-2xl font-bold text-white">Conta Aprovada!</h1>
                        <p className="text-emerald-400">Seu trial de 7 dias foi ativado. Redirecionando...</p>
                    </div>
                ) : (
                    <>
                        {/* Ícone animado */}
                        <div className="relative mx-auto w-24 h-24">
                            <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 animate-ping" />
                            <div className="absolute inset-2 rounded-full border-4 border-purple-500/40 animate-ping [animation-delay:0.3s]" />
                            <div className="relative flex items-center justify-center w-full h-full rounded-full bg-purple-500/10 border border-purple-500/30">
                                <span className="text-4xl">⏳</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-white">Aguardando Aprovação</h1>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Seu cadastro foi recebido com sucesso!<br />
                                Em breve o administrador irá aprovar seu acesso e<br />
                                seu trial gratuito de <span className="text-purple-400 font-semibold">7 dias</span> será ativado.
                            </p>
                        </div>

                        {email && (
                            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-gray-400">
                                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                                {email}
                            </div>
                        )}

                        {/* Banner WhatsApp Group */}
                        <a
                            href="https://chat.whatsapp.com/HzkpsDSGTQ26m4mSUUm8W4?mode=gi_t"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block w-full"
                        >
                            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/80 via-emerald-900/60 to-emerald-950/80 p-4 transition-all duration-300 hover:border-emerald-400/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                                {/* Glow background */}
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-emerald-400/10 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                <div className="relative flex items-center gap-4">
                                    {/* WhatsApp icon */}
                                    <div className="relative shrink-0">
                                        <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
                                        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-2xl">
                                            💬
                                        </div>
                                    </div>

                                    {/* Text */}
                                    <div className="flex-1 text-left">
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-0.5">
                                            ✨ Grupo Exclusivo
                                        </p>
                                        <p className="text-sm font-semibold text-white leading-snug">
                                            Enquanto aguarda a aprovação, entre no nosso Grupo <span className="text-emerald-400">Black de Velas Altas</span>!
                                        </p>
                                    </div>

                                    {/* Arrow */}
                                    <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 group-hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/30">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Bottom label */}
                                <div className="relative mt-3 flex items-center gap-2 border-t border-emerald-500/20 pt-2.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-[11px] text-emerald-400/80 font-medium">Toque para entrar no grupo agora</span>
                                </div>
                            </div>
                        </a>

                        {/* Status card */}
                        <div className="bg-[#111118] border border-white/10 rounded-2xl p-5 space-y-4 text-left">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Próximos passos</p>
                            <div className="space-y-3">
                                {[
                                    { done: true,    text: "Cadastro realizado ✓" },
                                    { done: false,   text: "Aguardando aprovação do administrador..." },
                                    { done: false,   text: "Trial de 7 dias será ativado automaticamente" },
                                    { done: false,   text: "Acesso liberado à plataforma" },
                                ].map((step, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                            step.done
                                                ? "bg-emerald-500 text-black"
                                                : i === 1
                                                    ? "bg-yellow-500/20 border border-yellow-500/40 text-yellow-400"
                                                    : "bg-white/5 border border-white/10 text-gray-600"
                                        }`}>
                                            {step.done ? "✓" : i + 1}
                                        </div>
                                        <span className={`text-sm ${step.done ? "text-emerald-400" : i === 1 ? "text-yellow-400" : "text-gray-600"}`}>
                                            {step.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Verificando status */}
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                            {checking
                                ? <><span className="w-3 h-3 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" /> Verificando status...</>
                                : <><span className="w-2 h-2 rounded-full bg-gray-700 animate-pulse" /> Verificando automaticamente a cada 15 segundos</>
                            }
                        </div>

                        <p className="text-xs text-gray-600">
                            Dúvidas?{" "}
                            <a
                                href="https://wa.me/5515981092500"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-500 hover:underline"
                            >
                                Falar com suporte
                            </a>
                        </p>
                    </>
                )}
            </div>
        </main>
    )
}
