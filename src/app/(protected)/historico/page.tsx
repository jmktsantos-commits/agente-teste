"use client"

import { useState } from 'react'
import { ExternalLink, Shield, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Heatmap } from "@/components/features/history/heatmap"
import { HistoryChart } from "@/components/features/history/history-chart"
import { HistoryTable } from "@/components/features/history/history-table"
import { CasinoCard } from '@/components/features/casino/CasinoCard'
import { getCasinoConfig } from '@/lib/casino-config'
import { trackCasinoClick, setPreferredPlatform } from '@/lib/analytics/track-casino'

export default function HistoryPage() {
    const esportivabet = getCasinoConfig('esportivabet')
    const [iframeOpen, setIframeOpen] = useState(false)

    const handlePlay = () => {
        trackCasinoClick({ platform: 'esportivabet', source: 'casino_page' })
        setPreferredPlatform('esportivabet')
        setIframeOpen(true)
    }

    const handleClose = () => setIframeOpen(false)

    const handleExternal = () => {
        window.open(esportivabet.affiliateUrl, '_blank', 'noopener,noreferrer')
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HistoryChart />
                <Heatmap />
            </div>
            <HistoryTable />

            {/* ===== ESPORTIVABET ===== */}
            {iframeOpen ? (
                /* Vista do iframe */
                <div className="flex flex-col rounded-2xl overflow-hidden border border-emerald-500/20" style={{ height: '80vh' }}>
                    <div className="flex items-center justify-between border-b border-white/10 bg-background/95 backdrop-blur-xl px-4 py-3 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full" style={{ background: esportivabet.color.gradient }} />
                            <h2 className="font-semibold">{esportivabet.displayName}</h2>
                            <span className="text-xs text-muted-foreground">{esportivabet.bonus}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleExternal} className="gap-2">
                                <ExternalLink className="h-4 w-4" />
                                Abrir em Nova Aba
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleClose}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 relative bg-white dark:bg-slate-950">
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none z-10">
                            <div className="pointer-events-auto space-y-3 text-center max-w-md p-6 rounded-xl bg-background/95 backdrop-blur-xl border border-white/10">
                                <Shield className="h-12 w-12 mx-auto text-amber-500" />
                                <p className="text-sm font-medium">Se a plataforma não carregar, use o botão abaixo</p>
                                <Button onClick={handleExternal} style={{ background: esportivabet.color.gradient }}>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Abrir EsportivaBet
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    Algumas plataformas bloqueiam incorporação por segurança.
                                </p>
                            </div>
                        </div>
                        <iframe
                            src={esportivabet.affiliateUrl}
                            className="w-full h-full relative z-20 bg-white"
                            title={esportivabet.displayName}
                            allow="fullscreen; payment; geolocation; microphone; camera"
                            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation"
                        />
                    </div>

                    <div className="flex items-center justify-center gap-2 border-t border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs shrink-0">
                        <Shield className="h-3 w-3 text-amber-500" />
                        <span className="text-amber-600 dark:text-amber-400">
                            Jogue com responsabilidade. Nunca aposte mais do que pode perder.
                        </span>
                    </div>
                </div>
            ) : (
                /* Card da EsportivaBet — mesmo visual da página Cassino */
                <div>
                    <div className="mb-4 flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
                            🎰 Plataforma Parceira
                        </h2>
                    </div>
                    <div className="max-w-lg">
                        <CasinoCard
                            casino={esportivabet}
                            onPlay={handlePlay}
                            playersOnline={Math.floor(Math.random() * 400) + 100}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
