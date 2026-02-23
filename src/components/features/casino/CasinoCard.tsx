'use client'

import { useState } from 'react'
import { ExternalLink, TrendingUp, Shield, Zap, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CasinoConfig } from '@/lib/casino-config'
import { trackCasinoClick, setPreferredPlatform } from '@/lib/analytics/track-casino'

interface CasinoCardProps {
    casino: CasinoConfig
    onPlay: (casino: CasinoConfig) => void
    playersOnline?: number
}

export function CasinoCard({ casino, onPlay, playersOnline = 0 }: CasinoCardProps) {
    const [isHovered, setIsHovered] = useState(false)

    const handlePlayClick = () => {
        // Track analytics
        trackCasinoClick({
            platform: casino.id,
            source: 'casino_page'
        })

        // Save preference
        setPreferredPlatform(casino.id)

        // Trigger parent callback (opens modal)
        onPlay(casino)
    }

    return (
        <div
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-background/50 to-background/30 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:shadow-2xl"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                background: isHovered
                    ? `linear-gradient(135deg, ${casino.color.primary}15 0%, ${casino.color.secondary}10 100%)`
                    : undefined
            }}
        >
            {/* Gradient Overlay */}
            <div
                className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                    background: casino.color.gradient,
                    opacity: 0.05
                }}
            />

            {/* Content */}
            <div className="relative p-8 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <h3 className="text-3xl font-bold" style={{ color: casino.color.primary }}>
                            {casino.displayName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {casino.description}
                        </p>
                    </div>

                    {/* Players Online Badge */}
                    {playersOnline > 0 && (
                        <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1.5 text-sm text-green-500">
                            <Users className="h-4 w-4" />
                            <span className="font-medium">{playersOnline} online</span>
                        </div>
                    )}
                </div>

                {/* Bonus Badge */}
                <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4">
                    <TrendingUp className="h-5 w-5 text-amber-500" />
                    <div>
                        <p className="text-xs text-muted-foreground">Bônus de Boas-Vindas</p>
                        <p className="font-bold text-amber-500">{casino.bonus}</p>
                    </div>
                </div>

                {/* Features */}
                <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground/80">Vantagens:</p>
                    <ul className="space-y-2">
                        {casino.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                                <span className="text-muted-foreground">{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Payment Methods */}
                <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Métodos de Pagamento:</p>
                    <div className="flex flex-wrap gap-2">
                        {casino.paymentMethods.map((method) => (
                            <span
                                key={method}
                                className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium"
                            >
                                {method}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Deposit Info */}
                <div className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="text-muted-foreground">
                        Depósito mínimo: <span className="font-semibold text-foreground">{casino.minDeposit}</span>
                    </span>
                </div>

                {/* CTA Button */}
                <Button
                    onClick={handlePlayClick}
                    className="w-full h-14 text-lg font-bold transition-all duration-300 hover:scale-105"
                    style={{
                        background: casino.color.gradient,
                        boxShadow: isHovered ? `0 10px 40px ${casino.color.primary}40` : undefined
                    }}
                >
                    <ExternalLink className="mr-2 h-5 w-5" />
                    Jogar Aviator Agora
                </Button>

                {/* Trust Badge */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>Plataforma Segura e Licenciada</span>
                </div>
            </div>
        </div>
    )
}
