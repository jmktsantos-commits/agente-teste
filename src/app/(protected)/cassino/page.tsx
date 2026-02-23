'use client'

import { useState, useEffect } from 'react'
import { Gamepad2, TrendingUp, Shield, Sparkles, X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CasinoCard } from '@/components/features/casino/CasinoCard'
import { getAllCasinoConfigs, type CasinoConfig } from '@/lib/casino-config'
import { trackCasinoClick, setPreferredPlatform } from '@/lib/analytics/track-casino'

export default function CassinoPage() {
    const casinos = getAllCasinoConfigs()
    const [activeCasino, setActiveCasino] = useState<CasinoConfig | null>(null)
    const [playersOnline, setPlayersOnline] = useState({ bravobet: 0, superbet: 0, esportivabet: 0 })

    const randomPlayers = () => Math.floor(Math.random() * (498 - 103 + 1)) + 103

    // Update player counts on mount and every 5-10 seconds to simulate live activity
    useEffect(() => {
        const update = () => {
            setPlayersOnline({
                bravobet: randomPlayers(),
                superbet: randomPlayers(),
                esportivabet: randomPlayers()
            })
        }

        update() // initial
        const interval = setInterval(update, Math.floor(Math.random() * 5000) + 5000) // 5–10s
        return () => clearInterval(interval)
    }, [])

    const handlePlayClick = (casino: CasinoConfig) => {
        // Track analytics
        trackCasinoClick({
            platform: casino.id,
            source: 'casino_page'
        })

        // Save preference
        setPreferredPlatform(casino.id)

        // Show iframe inline (sidebar remains visible)
        setActiveCasino(casino)
    }

    const handleClose = () => {
        setActiveCasino(null)
    }

    const handleOpenExternal = () => {
        if (activeCasino) {
            window.open(activeCasino.affiliateUrl, '_blank', 'noopener,noreferrer')
        }
    }



    // If casino is active, show iframe view inline (sidebar remains visible)
    if (activeCasino) {
        return (
            <div className="flex flex-col h-[calc(100vh-4rem)]">
                {/* Header Controls */}
                <div className="flex items-center justify-between border-b border-white/10 bg-background/95 backdrop-blur-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div
                            className="h-3 w-3 rounded-full"
                            style={{ background: activeCasino.color.gradient }}
                        />
                        <h2 className="font-semibold">{activeCasino.displayName}</h2>
                        <span className="text-xs text-muted-foreground">
                            {activeCasino.bonus}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">

                        {/* Open External */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenExternal}
                            className="gap-2"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Abrir em Nova Aba
                        </Button>

                        {/* Close Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Iframe Container */}
                <div className="flex-1 relative bg-white dark:bg-slate-950">
                    {/* Fallback Message (shows if iframe fails) */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none z-10">
                        <div className="pointer-events-auto space-y-3 text-center max-w-md p-6 rounded-xl bg-background/95 backdrop-blur-xl border border-white/10">
                            <Shield className="h-12 w-12 mx-auto text-amber-500" />
                            <p className="text-sm font-medium">
                                Se a plataforma não carregar, use o botão abaixo
                            </p>
                            <Button
                                onClick={handleOpenExternal}
                                style={{ background: activeCasino.color.gradient }}
                            >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Abrir {activeCasino.displayName}
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                Algumas plataformas bloqueiam incorporação por segurança.
                            </p>
                        </div>
                    </div>

                    {/* Main Iframe */}
                    <iframe
                        src={activeCasino.affiliateUrl}
                        className="w-full h-full relative z-20 bg-white"
                        title={activeCasino.displayName}
                        allow="fullscreen; payment; geolocation; microphone; camera"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation"
                    />
                </div>

                {/* Warning Bar */}
                <div className="flex items-center justify-center gap-2 border-t border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs shrink-0">
                    <Shield className="h-3 w-3 text-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400">
                        Jogue com responsabilidade. Nunca aposte mais do que pode perder.
                    </span>
                </div>
            </div >
        )
    }

    // Default view: Casino selection cards
    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <div className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-background via-background to-purple-500/5">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
                </div>

                <div className="container relative mx-auto px-4 py-16 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-4xl text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="rounded-2xl bg-gradient-to-br from-purple-500/20 to-orange-500/20 p-4">
                                <Gamepad2 className="h-12 w-12 text-purple-400" />
                            </div>
                        </div>

                        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                                Escolha Sua Plataforma
                            </span>
                        </h1>

                        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                            Acesse as melhores plataformas de Aviator com bônus exclusivos e
                            utilize nossos sinais para maximizar seus ganhos.
                        </p>

                        <div className="flex flex-wrap justify-center gap-3 pt-4">
                            <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm text-green-500">
                                <TrendingUp className="h-4 w-4" />
                                <span>Sinais Precisos</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-sm text-blue-500">
                                <Shield className="h-4 w-4" />
                                <span>Plataformas Seguras</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-full bg-purple-500/10 px-4 py-2 text-sm text-purple-500">
                                <Sparkles className="h-4 w-4" />
                                <span>Bônus Exclusivos</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Casino Cards Grid */}
            <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-6xl">
                    <div className="grid gap-8 md:grid-cols-2">
                        {casinos.map((casino) => (
                            <CasinoCard
                                key={casino.id}
                                casino={casino}
                                onPlay={handlePlayClick}
                                playersOnline={playersOnline[casino.id]}
                            />
                        ))}
                    </div>

                    {/* Info Section */}
                    <div className="mt-12 space-y-6 rounded-2xl border border-white/10 bg-gradient-to-br from-background/50 to-background/30 p-8 backdrop-blur-xl">
                        <h2 className="text-2xl font-bold">💡 Como Funciona?</h2>

                        <div className="grid gap-6 md:grid-cols-3">
                            <div className="space-y-2">
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/10 text-purple-500 font-bold text-xl">
                                    1
                                </div>
                                <h3 className="font-semibold">Escolha a Plataforma</h3>
                                <p className="text-sm text-muted-foreground">
                                    Selecione Bravobet, Superbet ou EsportivaBet baseado nos bônus e características
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-pink-500/10 text-pink-500 font-bold text-xl">
                                    2
                                </div>
                                <h3 className="font-semibold">Jogue Direto no Site</h3>
                                <p className="text-sm text-muted-foreground">
                                    A plataforma abre aqui mesmo, sem sair do nosso site
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 font-bold text-xl">
                                    3
                                </div>
                                <h3 className="font-semibold">Use Nossos Sinais</h3>
                                <p className="text-sm text-muted-foreground">
                                    Volte ao Dashboard a qualquer momento para ver novos sinais
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 mt-6">
                            <Shield className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
                            <div className="text-sm text-amber-600 dark:text-amber-400 space-y-1">
                                <p className="font-semibold">Jogue com Responsabilidade</p>
                                <p className="text-xs text-muted-foreground">
                                    Nunca aposte mais do que você pode perder. Não coletamos dados de acesso às plataformas.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
