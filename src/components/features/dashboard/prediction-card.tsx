"use client"

import { useEffect, useState } from "react"
import { TrendingUp, AlertTriangle, Activity, Clock, Target } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/utils/supabase/client"
import { getActivePrediction, generatePrediction, type Prediction, type Platform } from "@/lib/prediction-engine"

interface PredictionCardProps {
    selectedPlatform: Platform
}

export function PredictionCard({ selectedPlatform }: PredictionCardProps) {
    const [prediction, setPrediction] = useState<Prediction | null>(null)
    const [loading, setLoading] = useState(true)
    const [timeRemaining, setTimeRemaining] = useState<number>(0)

    const supabase = createClient()

    // Buscar previsão ativa ao carregar
    useEffect(() => {
        loadPrediction()
    }, [selectedPlatform])

    // Real-time subscription
    useEffect(() => {
        const channel = supabase
            .channel('predictions_changes')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'predictions'
            }, (payload: any) => {
                const newPrediction = payload.new as Prediction
                if (newPrediction.platform === selectedPlatform && newPrediction.is_active) {
                    setPrediction(newPrediction)
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedPlatform])

    // Atualizar tempo restante
    useEffect(() => {
        if (!prediction?.expires_at) return

        const interval = setInterval(() => {
            const expiry = new Date(prediction.expires_at).getTime()
            if (isNaN(expiry)) {
                setTimeRemaining(0)
                return
            }
            const remaining = expiry - Date.now()
            setTimeRemaining(Math.max(0, Math.floor(remaining / 1000)))
        }, 1000)

        return () => clearInterval(interval)
    }, [prediction])

    async function loadPrediction() {
        setLoading(true)

        // Buscar previsão existente (gerada pelo Railway scraper)
        const activePrediction = await getActivePrediction(selectedPlatform)

        setPrediction(activePrediction)
        setLoading(false)
    }

    const getPredictionConfig = () => {
        switch (prediction?.prediction_type) {
            case 'WAIT_HIGH':
                return {
                    icon: TrendingUp,
                    iconColor: 'text-green-500',
                    bgColor: 'bg-green-500/10',
                    borderColor: 'border-green-500/20',
                    label: 'AGUARDAR VELA ALTA',
                    badgeVariant: 'default' as const
                }
            case 'NORMAL':
                return {
                    icon: Activity,
                    iconColor: 'text-yellow-500',
                    bgColor: 'bg-yellow-500/10',
                    borderColor: 'border-yellow-500/20',
                    label: 'PADRÃO NORMAL',
                    badgeVariant: 'secondary' as const
                }
            default: // CAUTION
                return {
                    icon: AlertTriangle,
                    iconColor: 'text-red-500',
                    bgColor: 'bg-red-500/10',
                    borderColor: 'border-red-500/20',
                    label: 'CAUTELA',
                    badgeVariant: 'destructive' as const
                }
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    if (loading) {
        return (
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-6">
                    <div className="flex items-center justify-center">
                        <Activity className="w-6 h-6 animate-spin text-slate-400" />
                        <span className="ml-2 text-slate-400">Analisando padrões...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!prediction) {
        return null
    }

    const config = getPredictionConfig()
    const Icon = config.icon
    const confidencePercent = Math.round(prediction.confidence * 100)
    const suggestedTimes = prediction.suggested_range?.split(',').map(t => t.trim()).filter(t => t !== "") || []

    const formatTimeSafe = (dateStr?: string) => {
        if (!dateStr) return null
        const d = new Date(dateStr)
        return isNaN(d.getTime()) ? null : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }

    const nextAnalysisTime = formatTimeSafe(prediction.analysis_data?.next_analysis_at) ||
        formatTimeSafe(prediction.expires_at) ||
        '--:--'

    return (
        <Card className={`bg-slate-900 border-2 ${config.borderColor} relative overflow-hidden`}>
            <div className={`absolute top-0 right-0 p-2 z-10 mr-4 mt-2`}>
                <span className="text-[10px] text-slate-500 font-mono">
                    Próxima análise às {nextAnalysisTime}
                </span>
            </div>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-white">
                        <Icon className={`w-6 h-6 ${config.iconColor}`} />
                        Possibilidade de Velas Altas
                    </CardTitle>
                </div>
                <CardDescription className="text-slate-400">
                    Análise baseada nas últimas 200 rodadas
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Confiança */}
                <div className={`rounded-lg p-4 ${config.bgColor}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-300">Margem de Assertividade</span>
                        <span className={`text-2xl font-bold ${config.iconColor}`}>
                            {confidencePercent}%
                        </span>
                    </div>
                    <Progress value={confidencePercent} className="h-2" />
                </div>

                {/* Sugestão de multiplicador / Horários */}
                {suggestedTimes.length > 0 && prediction.suggested_range !== 'Evitar apostas' && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Target className="w-4 h-4 text-pink-500" />
                            <span className="font-bold text-pink-500 uppercase tracking-tighter">Janelas Confirmadas (10.00x+)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {suggestedTimes.map((time, idx) => (
                                <div key={idx} className="bg-slate-800 p-2 rounded border border-slate-700 flex items-center justify-center gap-2 hover:border-pink-500/30 transition-colors">
                                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                                    <span className="font-bold text-white font-mono">{time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Razão */}
                <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-300">Regras De Entrada:</div>
                    <div className="text-[11px] text-slate-400 bg-slate-800 rounded-lg p-3">
                        <ul className="space-y-1 list-disc list-inside italic">
                            <li>Fazer proteção em 2.1x com valor maior</li>
                            <li>Analisar Teto de Velas</li>
                            <li>Analisar se saiu um multiplicador próximo ao horário</li>
                            <li>Entrar 1 min antes ou depois, somente se tiver dando pelo menos 2x</li>
                        </ul>
                    </div>
                </div>

                {/* Tempo restante */}
                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800 pt-3">
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Contagem regressiva:</span>
                    </div>
                    <span className="font-mono">{formatTime(timeRemaining)}</span>
                </div>
            </CardContent>
        </Card>
    )
}
