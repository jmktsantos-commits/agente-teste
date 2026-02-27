"use client"

import { Heatmap } from "@/components/features/history/heatmap"
import { HistoryChart } from "@/components/features/history/history-chart"
import { HistoryTable } from "@/components/features/history/history-table"

const ESPORTIVABET_URL = "https://go.aff.esportiva.bet/8ywkf5b2?utm_campaign=site"

export default function HistoryPage() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HistoryChart />
                <Heatmap />
            </div>
            <HistoryTable />

            {/* ===== SEÇÃO ESPORTIVABET ===== */}
            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#0a1a0f] to-[#050d08] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-500/10">
                    <div className="flex items-center gap-3">
                        <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_2px_rgba(34,197,94,0.6)]" />
                        <span className="font-bold text-emerald-400 tracking-wide text-sm uppercase">
                            🎰 EsportivaBet — Plataforma parceira
                        </span>
                    </div>
                    <a
                        href={ESPORTIVABET_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400/60 hover:text-emerald-400 transition-colors"
                    >
                        Abrir em nova aba ↗
                    </a>
                </div>

                {/* Card de acesso */}
                <div className="flex flex-col md:flex-row items-center gap-8 px-6 py-8">

                    {/* Ícone / visual */}
                    <div className="shrink-0 flex flex-col items-center justify-center w-36 h-36 rounded-2xl bg-emerald-950/50 border border-emerald-500/20 shadow-inner">
                        <span className="text-5xl">🎯</span>
                        <span className="text-xs text-emerald-400/60 mt-2 font-medium">Aviator</span>
                    </div>

                    {/* Texto */}
                    <div className="flex-1 space-y-3 text-center md:text-left">
                        <h3 className="text-white font-bold text-xl">
                            Use as previsões em tempo real
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-lg">
                            Você já tem sua conta na EsportivaBet. Use o histórico de velas acima para identificar o melhor momento e acesse a plataforma para apostar com base nas previsões da IA.
                        </p>
                        <ul className="flex flex-wrap gap-x-6 gap-y-1.5 justify-center md:justify-start">
                            {[
                                "✓ Saque via PIX",
                                "✓ Aviator 24h",
                                "✓ Bônus para novos depósitos",
                            ].map((item, i) => (
                                <li key={i} className="text-emerald-400 text-sm">{item}</li>
                            ))}
                        </ul>
                    </div>

                    {/* CTA */}
                    <div className="shrink-0">
                        <a
                            href={ESPORTIVABET_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-bold px-8 py-4 rounded-xl transition-all transform hover:scale-[1.04] shadow-lg shadow-emerald-500/25 text-center"
                        >
                            <span className="text-2xl">🚀</span>
                            <span>Acessar EsportivaBet</span>
                            <span className="text-xs font-normal opacity-70">Abre em nova aba</span>
                        </a>
                    </div>
                </div>

                {/* Barra inferior */}
                <div className="px-5 py-3 bg-emerald-950/30 border-t border-emerald-500/10 flex items-center gap-2">
                    <span className="text-xs text-gray-600">
                        🔒 Parceria oficial · Jogue com responsabilidade · +18
                    </span>
                </div>
            </div>
        </div>
    )
}
