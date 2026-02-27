"use client"

import Link from "next/link"
import { BarChart2, Gamepad2, TrendingUp, Radio, BookOpen } from "lucide-react"

// 🔴 COLOQUE AQUI O ID DO VÍDEO DO YOUTUBE (parte após "watch?v=" ou o código final do link)
// Exemplo: https://youtu.be/dQw4w9WgXcQ → ID = dQw4w9WgXcQ
const YOUTUBE_VIDEO_ID = "SUBSTITUA_PELO_ID_DO_VIDEO"

const quickLinks = [
    {
        href: "/dashboard",
        icon: TrendingUp,
        label: "Sinais ao Vivo",
        desc: "Ver previsões e histórico",
        color: "from-purple-500/20 to-pink-500/20 border-purple-500/20 hover:border-purple-500/40",
        iconColor: "text-purple-400",
    },
    {
        href: "/cassino",
        icon: Gamepad2,
        label: "Cassino",
        desc: "Acessar plataformas parceiras",
        color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/20 hover:border-emerald-500/40",
        iconColor: "text-emerald-400",
    },
    {
        href: "/live",
        icon: Radio,
        label: "Live",
        desc: "Acompanhar rodadas em tempo real",
        color: "from-red-500/20 to-orange-500/20 border-red-500/20 hover:border-red-500/40",
        iconColor: "text-red-400",
    },
    {
        href: "/aprender",
        icon: BookOpen,
        label: "Aprender",
        desc: "Guias e estratégias",
        color: "from-blue-500/20 to-cyan-500/20 border-blue-500/20 hover:border-blue-500/40",
        iconColor: "text-blue-400",
    },
]

export default function BoasVindasPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero */}
            <div className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-background via-background to-purple-500/5 px-4 pt-12 pb-8 text-center">
                {/* Glows */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-3xl" />
                    <div className="absolute top-0 -right-24 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl" />
                </div>

                <div className="relative mx-auto max-w-3xl space-y-4">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-xs font-semibold text-purple-300 uppercase tracking-widest">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                        Plataforma Oficial
                    </div>

                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
                        <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                            Bem-vindo à
                        </span>{" "}
                        <span className="text-white">Aviator Pro</span>
                    </h1>

                    <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                        Assista ao vídeo de boas-vindas e aprenda como usar a plataforma para maximizar seus resultados.
                    </p>
                </div>
            </div>

            {/* Vídeo Player */}
            <div className="mx-auto max-w-4xl px-4 py-10">
                <div
                    className="relative w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-purple-500/10"
                    style={{ paddingBottom: "56.25%" /* 16:9 */ }}
                >
                    {YOUTUBE_VIDEO_ID === "SUBSTITUA_PELO_ID_DO_VIDEO" ? (
                        // Placeholder enquanto vídeo não foi configurado
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-4">
                            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white/5 border border-white/10">
                                <svg className="h-10 w-10 text-white/30" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                            <p className="text-white/30 text-sm">Vídeo de boas-vindas</p>
                        </div>
                    ) : (
                        <iframe
                            className="absolute inset-0 w-full h-full"
                            src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=0&rel=0&modestbranding=1`}
                            title="Vídeo de Boas-Vindas — Aviator Pro"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    )}
                </div>

                {/* Caption */}
                <p className="mt-4 text-center text-sm text-muted-foreground">
                    Assista ao vídeo completo para entender como usar os sinais a seu favor.
                </p>
            </div>

            {/* Quick Links */}
            <div className="mx-auto max-w-4xl px-4 pb-16">
                <h2 className="text-center text-lg font-bold text-white mb-6">
                    Explore a Plataforma
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {quickLinks.map(({ href, icon: Icon, label, desc, color, iconColor }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`group flex flex-col items-center gap-3 rounded-xl border bg-gradient-to-br p-5 text-center transition-all duration-200 hover:scale-[1.03] hover:shadow-lg ${color}`}
                        >
                            <div className={`flex items-center justify-center w-11 h-11 rounded-xl bg-white/5 group-hover:bg-white/10 transition-all ${iconColor}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">{label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
