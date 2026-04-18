"use client"

import { useEffect, useState } from "react"

const CHECKOUT_STARTER = process.env.NEXT_PUBLIC_CHECKOUT_MENSAL || "https://sandbox.asaas.com/c/9g65d6vkig15fsu7"
const CHECKOUT_ANUAL = process.env.NEXT_PUBLIC_CHECKOUT_ANUAL || "https://sandbox.asaas.com/c/jtot6ozwz20sgnrm"
const CHECKOUT_BLACK = process.env.NEXT_PUBLIC_CHECKOUT_BLACK || "https://sandbox.asaas.com/c/wdj5s6op557z9txk"
const WHATSAPP_NUMBER = "5515981092500"

export default function TrialExpiradoPage() {
    const [countdown, setCountdown] = useState({ hours: 23, minutes: 59, seconds: 59 })

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
            price: "R$47",
            period: "/mês",
            highlight: false,
            checkoutUrl: CHECKOUT_STARTER,
            features: ["Acesso à Plataforma", "Histórico e Análise de Velas Altas", "Gestão de Banca Inteligente", "Curso Avançado Aviator", "Suporte via Chat"],
        },
        {
            name: "Anual",
            price: "R$397",
            period: "/ano",
            highlight: true,
            badge: "✔ MAIS ESCOLHIDO",
            sub: "Equivale a apenas R$33,08 por mês",
            checkoutUrl: CHECKOUT_ANUAL,
            features: ["Tudo do Starter", "Grupo VIP no WhatsApp", "Suporte Direto com Especialista"],
        },
        {
            name: "Black Elite",
            price: "R$997",
            period: "/ano",
            highlight: false,
            badge: "◆ ELITE",
            checkoutUrl: CHECKOUT_BLACK,
            features: ["Tudo do Anual", "Mentoria Particular (6 Encontros/Ano)"],
        },
    ]

    return (
        <main className="min-h-screen bg-[#0a0a0f] text-white">
            {/* Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-orange-500/8 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/6 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-3xl mx-auto px-4 py-12 space-y-10">

                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm px-4 py-2 rounded-full">
                        <span className="animate-pulse">●</span> Seu acesso gratuito de 7 dias expirou
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                        Você viu o potencial. <br />
                        <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                            Agora é hora de usar de verdade.
                        </span>
                    </h1>
                    <p className="text-gray-400 text-base max-w-xl mx-auto">
                        Suas previsões do Aviator continuam rodando. Você só precisa reativar o acesso.
                    </p>
                </div>


                {/* Oferta especial com countdown */}
                <div className="bg-white/3 border border-white/10 rounded-2xl p-5 text-center">
                    <p className="text-emerald-400 font-semibold text-sm uppercase tracking-wider mb-3">
                        ⚡ Oferta especial para quem veio do trial — expira em:
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
                                <div key={i} className="bg-[#0a0a0f] border border-white/10 rounded-xl p-3 min-w-[60px] text-center">
                                    <div className="text-2xl font-bold text-white tabular-nums">
                                        {String(item.v).padStart(2, "0")}
                                    </div>
                                    <div className="text-xs text-gray-500">{item.label}</div>
                                </div>
                            )
                        )}
                    </div>
                    <p className="text-gray-400 text-sm mt-3">
                        🎁 20% de desconto no primeiro mês — só para usuários de trial
                    </p>
                </div>

                {/* Planos */}
                <div>
                    <h2 className="text-center text-lg font-semibold mb-5 text-gray-200">
                        Escolha seu plano e fale com a gente no WhatsApp
                    </h2>
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
                                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${plan.highlight ? "bg-emerald-500 text-black" : "bg-amber-500 text-black"
                                        }`}>
                                        {plan.badge}
                                    </div>
                                )}
                                <div className="mb-4">
                                    <h3 className="font-bold text-lg">{plan.name}</h3>
                                    <div className="flex items-baseline gap-1 mt-1">
                                        <span className="text-3xl font-bold text-white">{plan.price}</span>
                                        <span className="text-gray-400 text-sm">{plan.period}</span>
                                    </div>
                                    {'sub' in plan && (
                                        <p className="text-xs text-emerald-400 mt-1">{(plan as { sub: string }).sub}</p>
                                    )}
                                </div>
                                <ul className="space-y-2 mb-6">
                                    {plan.features.map((f, j) => (
                                        <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                                            <span className="text-emerald-500">✓</span> {f}
                                        </li>
                                    ))}
                                </ul>
                                <a
                                    href={plan.checkoutUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`block w-full py-3 rounded-xl font-semibold text-center transition-all ${plan.highlight
                                            ? "bg-emerald-500 hover:bg-emerald-400 text-black"
                                            : plan.name === "Black Elite"
                                                ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 text-black"
                                                : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                                        }`}
                                >
                                    Assinar {plan.name} →
                                </a>
                            </div>
                        ))}
                    </div>
                    <p className="text-center text-xs text-gray-600 mt-4">
                        🔒 Pagamento seguro · PIX / Cartão / Boleto
                    </p>
                </div>

                {/* Depoimentos */}
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

                {/* Footer */}
                <p className="text-center text-gray-600 text-sm pb-4">
                    Dúvidas?{" "}
                    <a
                        href={`https://wa.me/${WHATSAPP_NUMBER}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:underline"
                    >
                        Falar com suporte no WhatsApp
                    </a>
                </p>
            </div>
        </main>
    )
}
