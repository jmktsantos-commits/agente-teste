'use client'

import { useState } from 'react'
import { ExternalLink, Shield, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const CASINO_URL  = 'https://1pra1.bet.br/Jean'
const CASINO_NAME = '1PARA1'

export default function CassinoPage() {
    const [loading, setLoading] = useState(true)
    const [blocked, setBlocked] = useState(false)

    const handleLoad = () => setLoading(false)

    const handleError = () => {
        setLoading(false)
        setBlocked(true)
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">

            {/* ── Header ── */}
            <div className="flex items-center justify-between border-b border-white/10 bg-background/95 backdrop-blur-xl px-4 py-3 shrink-0">
                <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-purple-500 animate-pulse" />
                    <h2 className="font-bold text-white tracking-wide uppercase text-sm">
                        {CASINO_NAME}
                    </h2>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                        Plataforma Oficial
                    </span>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs border-white/10 hover:border-purple-500/50"
                    onClick={() => window.open(CASINO_URL, '_blank', 'noopener,noreferrer')}
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir em Nova Aba
                </Button>
            </div>

            {/* ── Iframe Area ── */}
            <div className="flex-1 relative bg-slate-950">

                {/* Loading Spinner */}
                {loading && !blocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20 bg-slate-950">
                        <Loader2 className="h-10 w-10 text-purple-400 animate-spin" />
                        <p className="text-sm text-muted-foreground">
                            Carregando {CASINO_NAME}...
                        </p>
                    </div>
                )}

                {/* Blocked Fallback */}
                {blocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-20 bg-slate-950 p-6 text-center">
                        <Shield className="h-14 w-14 text-amber-400" />
                        <div className="space-y-2 max-w-sm">
                            <p className="text-white font-bold text-lg">
                                Plataforma bloqueou incorporação
                            </p>
                            <p className="text-sm text-muted-foreground">
                                A {CASINO_NAME} está bloqueando a exibição interna. Clique abaixo para abrir em nova aba e jogar normalmente.
                            </p>
                        </div>
                        <Button
                            size="lg"
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold gap-2"
                            onClick={() => window.open(CASINO_URL, '_blank', 'noopener,noreferrer')}
                        >
                            <ExternalLink className="h-4 w-4" />
                            Abrir {CASINO_NAME}
                        </Button>
                    </div>
                )}

                {/* Iframe */}
                {!blocked && (
                    <iframe
                        src={CASINO_URL}
                        className="w-full h-full relative z-10"
                        title={CASINO_NAME}
                        onLoad={handleLoad}
                        onError={handleError}
                        allow="fullscreen; payment; geolocation"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation"
                    />
                )}
            </div>

            {/* ── Warning Bar ── */}
            <div className="flex items-center justify-center gap-2 border-t border-amber-500/20 bg-amber-500/5 px-4 py-2 text-xs shrink-0">
                <Shield className="h-3 w-3 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">
                    Jogue com responsabilidade. Nunca aposte mais do que pode perder. +18
                </span>
            </div>
        </div>
    )
}
