"use client"

import { useState, useEffect } from "react"
import { ExternalLink, Shield, ChevronRight, Gamepad2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { RecentHistoryTable } from "@/components/features/dashboard/recent-history"
import { SignalCard } from "@/components/features/dashboard/signal-card"
import { StatsGrid } from "@/components/features/dashboard/stats-grid"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Platform } from "@/lib/prediction-engine"

const ESPORTIVABET_URL = "https://go.aff.esportiva.bet/8ywkf5b2?utm_campaign=site"

export default function DashboardPage() {
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>("bravobet")
    const [popupOpen, setPopupOpen] = useState(false)
    const [popupRef, setPopupRef] = useState<Window | null>(null)

    // Detecta quando o popup for fechado pelo usuário
    useEffect(() => {
        if (!popupOpen || !popupRef) return
        const interval = setInterval(() => {
            if (popupRef.closed) {
                setPopupOpen(false)
                setPopupRef(null)
            }
        }, 500)
        return () => clearInterval(interval)
    }, [popupOpen, popupRef])

    const handleJogar = () => {
        const popup = window.open(
            ESPORTIVABET_URL,
            'esportivabet',
            'width=1280,height=800,top=80,left=100,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no'
        )
        if (popup) {
            setPopupRef(popup)
            setPopupOpen(true)
            popup.focus()
        } else {
            // Bloqueado por pop-up blocker → abre em nova aba como fallback
            window.open(ESPORTIVABET_URL, '_blank', 'noopener,noreferrer')
        }
    }

    const handleFocarJanela = () => {
        if (popupRef && !popupRef.closed) {
            popupRef.focus()
        }
    }

    return (
        <div className="space-y-6">
            {/* Top Section: Title + Selection */}
            <div className="flex flex-col items-center gap-6 py-6">
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent text-center">
                    Plataforma de Análise
                </h1>

                <Tabs defaultValue="bravobet" className="w-full max-w-[600px]" onValueChange={(v: string) => setSelectedPlatform(v as Platform)}>
                    <TabsList className="grid w-full grid-cols-3 bg-slate-900 border border-slate-800 h-12 p-1">
                        <TabsTrigger value="bravobet" className="text-xs font-bold data-[state=active]:bg-purple-600 data-[state=active]:text-white h-full">BRAVOBET</TabsTrigger>
                        <TabsTrigger value="esportivabet" className="text-xs font-bold data-[state=active]:bg-green-600 data-[state=active]:text-white h-full">ESPORTIVABET</TabsTrigger>
                        <TabsTrigger value="superbet" className="text-xs font-bold data-[state=active]:bg-pink-600 data-[state=active]:text-white h-full">SUPERBET</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* 1. Signal Card */}
            <ErrorBoundary name="SignalCard">
                <SignalCard selectedPlatform={selectedPlatform} />
            </ErrorBoundary>

            {/* 2. Stats Grid */}
            <ErrorBoundary name="StatsGrid">
                <StatsGrid selectedPlatform={selectedPlatform} />
            </ErrorBoundary>

            {/* 3. History Table */}
            <ErrorBoundary name="RecentHistoryTable">
                <RecentHistoryTable selectedPlatform={selectedPlatform} />
            </ErrorBoundary>

            {/* 4. Banner EsportivaBet */}
            {popupOpen ? (
                /* Estado: jogando na EsportivaBet — janela popup aberta */
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full rounded-xl border border-emerald-500/30 bg-gradient-to-r from-[#071a0e] via-[#0a2214] to-[#071a0e] px-6 py-5">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 shrink-0">
                            <Gamepad2 className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm">Você está jogando na EsportivaBet</p>
                            <p className="text-emerald-400/70 text-xs">Janela aberta em segundo plano</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            onClick={handleFocarJanela}
                            className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm gap-2"
                            size="sm"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Focar na janela
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white text-xs"
                            onClick={() => { popupRef?.close(); setPopupOpen(false); setPopupRef(null) }}
                        >
                            Fechar
                        </Button>
                    </div>
                </div>
            ) : (
                /* Banner retangular clicável */
                <>
                    <button
                        onClick={handleJogar}
                        className="group flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full rounded-xl border border-emerald-500/25 bg-gradient-to-r from-[#071a0e] via-[#0a2214] to-[#071a0e] hover:border-emerald-400/50 hover:from-[#0a2214] hover:to-[#0a2214] transition-all duration-300 px-6 py-5 cursor-pointer shadow-lg shadow-emerald-900/20 text-left"
                    >
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 shrink-0">
                                <span className="text-2xl">🎯</span>
                            </div>
                            <div>
                                <p className="text-xs text-emerald-400/70 uppercase tracking-widest font-semibold">Parceira Oficial</p>
                                <p className="text-white font-bold text-base leading-tight">EsportivaBet</p>
                            </div>
                        </div>

                        <div className="hidden sm:block w-px h-10 bg-emerald-500/15 shrink-0" />

                        <div className="flex flex-wrap gap-x-5 gap-y-1.5 flex-1 justify-center sm:justify-start">
                            {["CASHBACK no Aviator", "PIX instantâneo", "Plataforma regulamentada", "Depósito mín. R$10"].map((f, i) => (
                                <span key={i} className="flex items-center gap-1.5 text-sm text-gray-300">
                                    <span className="text-emerald-500 text-xs">✓</span> {f}
                                </span>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 bg-emerald-500 group-hover:bg-emerald-400 text-black font-bold px-5 py-2.5 rounded-lg transition-all shrink-0 text-sm whitespace-nowrap">
                            <ChevronRight className="h-4 w-4" />
                            Jogar Agora
                        </div>
                    </button>

                    <div className="flex items-center justify-center gap-2 -mt-3">
                        <Shield className="h-3 w-3 text-gray-600" />
                        <span className="text-xs text-gray-600">Jogue com responsabilidade · +18 · Parceria oficial</span>
                    </div>
                </>
            )}
        </div>
    )
}
