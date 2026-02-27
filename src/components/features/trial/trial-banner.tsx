"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface TrialStatus {
    trial_active: boolean
    trial_expired: boolean
    expires_at: string
    hours_remaining: number
    minutes_remaining: number
    plan: string
}

export function TrialBanner() {
    const router = useRouter()
    const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })
    const [dismissed, setDismissed] = useState(false)

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/trial/status")
            if (res.ok) {
                const data = await res.json()
                setTrialStatus(data)
                // Se trial já expirou no servidor → redirecionar imediatamente
                if (data.plan === "trial" && data.trial_expired) {
                    window.location.href = "https://agente-teste-three.vercel.app/"
                }
            }
        } catch {
            // silently fail
        }
    }, [router])

    useEffect(() => {
        fetchStatus()
        // Re-verificar o status a cada 5 minutos (caso o usuário fique com a aba aberta)
        const statusInterval = setInterval(fetchStatus, 5 * 60 * 1000)
        return () => clearInterval(statusInterval)
    }, [fetchStatus])

    // Countdown em tempo real
    useEffect(() => {
        if (!trialStatus?.trial_active || !trialStatus?.expires_at) return

        const updateCountdown = () => {
            const now = new Date()
            const expires = new Date(trialStatus.expires_at)
            const diff = expires.getTime() - now.getTime()

            if (diff <= 0) {
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
                window.location.href = "https://agente-teste-three.vercel.app/"
                return
            }

            const h = Math.floor(diff / (1000 * 60 * 60))
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const s = Math.floor((diff % (1000 * 60)) / 1000)
            setTimeLeft({ hours: h, minutes: m, seconds: s })
        }

        updateCountdown()
        const interval = setInterval(updateCountdown, 1000)
        return () => clearInterval(interval)
    }, [trialStatus, router])

    // Não mostrar se: não é trial ativo, ou já dispensou
    if (!trialStatus?.trial_active || trialStatus?.plan !== "trial" || dismissed) {
        return null
    }

    const isUrgent = trialStatus.hours_remaining <= 2

    return (
        <div className={`relative flex items-center justify-between gap-3 px-4 py-2.5 text-sm border-b transition-all ${isUrgent
            ? "bg-orange-950/50 border-orange-500/30 text-orange-300"
            : "bg-emerald-950/50 border-emerald-500/20 text-emerald-300"
            }`}>
            {/* Pulse indicator */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`flex-shrink-0 h-2 w-2 rounded-full animate-pulse ${isUrgent ? "bg-orange-400" : "bg-emerald-400"}`} />
                <span className="font-medium whitespace-nowrap">
                    {isUrgent ? "⚠️ Trial expirando!" : "🎁 Trial gratuito ativo"}
                </span>
                <span className="text-white/60 hidden sm:block truncate">
                    {isUrgent ? "Ative seu plano para não perder o acesso." : "Você está testando a plataforma gratuitamente."}
                </span>
            </div>

            {/* Countdown */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                {[
                    { v: timeLeft.hours, l: "h" },
                    { v: timeLeft.minutes, l: "m" },
                    { v: timeLeft.seconds, l: "s" },
                ].map((item, i) => (
                    <div key={i} className="flex items-center gap-0.5">
                        <span className={`font-mono font-bold text-base ${isUrgent ? "text-orange-300" : "text-white"}`}>
                            {String(item.v).padStart(2, "0")}
                        </span>
                        <span className="text-xs text-white/40">{item.l}</span>
                        {i < 2 && <span className="text-white/30 mx-0.5">:</span>}
                    </div>
                ))}
            </div>

            {/* CTA */}
            <Link
                href="https://agente-teste-three.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${isUrgent
                    ? "bg-orange-500 hover:bg-orange-400 text-black"
                    : "bg-emerald-500 hover:bg-emerald-400 text-black"
                    }`}
            >
                Ativar plano
            </Link>

            {/* Dismiss — só disponível se não for urgente */}
            {!isUrgent && (
                <button
                    onClick={() => setDismissed(true)}
                    className="flex-shrink-0 text-white/30 hover:text-white/60 transition-colors ml-1"
                    aria-label="Fechar"
                >
                    ✕
                </button>
            )}
        </div>
    )
}
