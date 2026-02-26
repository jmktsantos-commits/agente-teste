"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function TrialExpiradoPage() {
    const router = useRouter()
    const [countdown, setCountdown] = useState({ hours: 23, minutes: 59, seconds: 59 })

    // Contador de urgência regressivo falso para criar senso de urgência da oferta
    useEffect(() => {
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 }
                if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
                if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
                clearInterval(interval)
                return prev
            })
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    const plans = [
        {
            name: "Starter",
            price: "R$ 47",
            period: "/mês",
            highlight: false,
            features: ["Previsões diárias", "Histórico 30 dias", "Chat da comunidade"],
        },
        {
            name: "Pro",
            price: "R$ 97",
            period: "/mês",
            highlight: true,
            badge: "🔥 MAIS POPULAR",
            features: ["Tudo do Starter", "Previsões em tempo real", "Lives exclusivas", "IA avançada", "Suporte prioritário"],
        },
        {
            name: "VIP",
            price: "R$ 197",
            period: "/mês",
            highlight: false,
            features: ["Tudo do Pro", "Grupo VIP privado", "Sinais antecipados", "1:1 com experts"],
        },
    ]

    return (
        <main className="min-h-screen bg-[#0a0a0f] text-white">
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-4xl mx-auto px-4 py-12 space-y-12">

                {/* Header de expiração */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm px-4 py-2 rounded-full">
                        <span className="animate-pulse">●</span> Seu teste gratuito expirou
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold">
                        Não perca o acesso às <br />
                        <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                            previsões de hoje
                        </span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-xl mx-auto">
                        Você viu o potencial da plataforma. Agora dê o próximo passo e maximize seus resultados com um plano completo.
                    </p>
                </div>

                {/* Oferta especial com countdown */}
                <div className="bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border border-emerald-500/20 rounded-2xl p-6 text-center">
                    <p className="text-emerald-400 font-semibold text-sm uppercase tracking-wider mb-3">
                        ⚡ Oferta especial de boas-vindas — expira em:
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        {[
                            { v: countdown.hours, label: "horas" },
                            { v: null, label: ":" },
                            { v: countdown.minutes, label: "min" },
                            { v: null, label: ":" },
                            { v: countdown.seconds, label: "seg" },
                        ].map((item, i) =>
                            item.v === null ? (
                                <span key={i} className="text-gray-400 text-xl font-bold">:</span>
                            ) : (
                                <div key={i} className="bg-[#0a0a0f] border border-white/10 rounded-xl p-3 min-w-[64px] text-center">
                                    <div className="text-2xl font-bold text-white tabular-nums">
                                        {String(item.v).padStart(2, "0")}
                                    </div>
                                    <div className="text-xs text-gray-500">{item.label}</div>
                                </div>
                            )
                        )}
                    </div>
                    <p className="text-gray-400 text-sm mt-3">
                        🎁 20% de desconto no primeiro mês para usuários de trial
                    </p>
                </div>

                {/* Planos */}
                <div>
                    <h2 className="text-center text-xl font-semibold mb-6 text-gray-200">Escolha seu plano</h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        {plans.map((plan, i) => (
                            <div
                                key={i}
                                className={`relative rounded-2xl p-6 border transition-all ${plan.highlight
                                        ? "border-emerald-500/50 bg-gradient-to-b from-emerald-900/20 to-[#111118] shadow-lg shadow-emerald-500/10 scale-[1.02]"
                                        : "border-white/10 bg-[#111118]"
                                    }`}
                            >
                                {plan.badge && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                                        {plan.badge}
                                    </div>
                                )}
                                <div className="mb-4">
                                    <h3 className="font-bold text-lg">{plan.name}</h3>
                                    <div className="flex items-baseline gap-1 mt-1">
                                        <span className="text-3xl font-bold text-white">{plan.price}</span>
                                        <span className="text-gray-400 text-sm">{plan.period}</span>
                                    </div>
                                    {plan.highlight && (
                                        <p className="text-xs text-emerald-400 mt-1 line-through opacity-60">R$ 121/mês</p>
                                    )}
                                </div>
                                <ul className="space-y-2 mb-6">
                                    {plan.features.map((f, j) => (
                                        <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                                            <span className="text-emerald-500">✓</span> {f}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    className={`w-full py-3 rounded-xl font-semibold transition-all ${plan.highlight
                                            ? "bg-emerald-500 hover:bg-emerald-400 text-black"
                                            : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                                        }`}
                                >
                                    Assinar {plan.name}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Depoimentos rápidos */}
                <div className="grid md:grid-cols-3 gap-4">
                    {[
                        { name: "Carlos M.", text: "\"Fiz o trial e assinei no mesmo dia. As previsões são incríveis!\"", stars: 5 },
                        { name: "Ana R.", text: "\"Nunca vi uma plataforma tão precisa. Vale cada centavo.\"", stars: 5 },
                        { name: "Lucas T.", text: "\"O trial me convenceu. Agora sou assinante VIP há 3 meses.\"", stars: 5 },
                    ].map((t, i) => (
                        <div key={i} className="bg-[#111118] border border-white/10 rounded-xl p-4">
                            <div className="flex text-yellow-400 mb-2">{"★".repeat(t.stars)}</div>
                            <p className="text-sm text-gray-300 italic">{t.text}</p>
                            <p className="text-xs text-gray-500 mt-2">— {t.name}</p>
                        </div>
                    ))}
                </div>

                {/* Footer link */}
                <p className="text-center text-gray-600 text-sm">
                    Precisa de ajuda?{" "}
                    <a href="/suporte" className="text-emerald-400 hover:underline">Falar com suporte</a>
                    {" · "}
                    <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-400">Voltar</button>
                </p>
            </div>
        </main>
    )
}
