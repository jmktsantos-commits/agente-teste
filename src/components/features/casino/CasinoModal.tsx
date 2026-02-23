'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, AlertTriangle, X } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { CasinoConfig } from '@/lib/casino-config'

interface CasinoModalProps {
    casino: CasinoConfig | null
    isOpen: boolean
    onClose: () => void
    onConfirm: (casino: CasinoConfig) => void
}

export function CasinoModal({ casino, isOpen, onClose, onConfirm }: CasinoModalProps) {
    const [countdown, setCountdown] = useState(5)
    const [autoRedirect, setAutoRedirect] = useState(true)

    useEffect(() => {
        if (!isOpen || !autoRedirect) {
            setCountdown(5)
            return
        }

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1 && casino) {
                    onConfirm(casino)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [isOpen, autoRedirect, casino, onConfirm])

    if (!casino) return null

    const handleManualConfirm = () => {
        onConfirm(casino)
    }

    const handleCancelAutoRedirect = () => {
        setAutoRedirect(false)
        setCountdown(5)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ExternalLink className="h-5 w-5" />
                        Redirecionando para {casino.displayName}
                    </DialogTitle>
                    <DialogDescription>
                        Você será redirecionado para a plataforma externa em instantes
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Casino Info */}
                    <div
                        className="rounded-lg p-4"
                        style={{ background: casino.color.gradient, opacity: 0.1 }}
                    >
                        <p className="text-sm font-medium" style={{ color: casino.color.primary }}>
                            {casino.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {casino.bonus}
                        </p>
                    </div>

                    {/* Responsible Gaming Warning */}
                    <div className="flex gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                        <div className="space-y-1 text-sm">
                            <p className="font-semibold text-amber-600 dark:text-amber-400">
                                Jogue com Responsabilidade
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Nunca aposte mais do que você pode perder. Defina limites e jogue de forma consciente.
                            </p>
                        </div>
                    </div>

                    {/* Countdown */}
                    {autoRedirect && countdown > 0 && (
                        <div className="text-center space-y-2">
                            <div className="flex items-center justify-center">
                                <div
                                    className="flex items-center justify-center w-16 h-16 rounded-full font-bold text-2xl"
                                    style={{
                                        background: casino.color.gradient,
                                        boxShadow: `0 0 20px ${casino.color.primary}40`
                                    }}
                                >
                                    {countdown}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelAutoRedirect}
                                className="text-xs"
                            >
                                <X className="mr-1 h-3 w-3" />
                                Cancelar redirecionamento automático
                            </Button>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Voltar
                        </Button>
                        <Button
                            onClick={handleManualConfirm}
                            className="flex-1"
                            style={{ background: casino.color.gradient }}
                        >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ir Agora
                        </Button>
                    </div>

                    {/* Disclaimer */}
                    <p className="text-xs text-center text-muted-foreground">
                        Ao continuar, você será redirecionado para um site externo.
                        Não coletamos dados de acesso à plataforma.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
