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
            const remaining = new Date(prediction.expires_at).getTime() - Date.now()
            setTimeRemaining(Math.max(0, Math.floor(remaining / 1000)))
        }, 1000)

        return () => clearInterval(interval)
    }, [prediction])

    async function loadPrediction() {
        setLoading(true)

        // Tentar buscar previsão existente
        let activePrediction = await getActivePrediction(selectedPlatform)

        // Se não houver, gerar nova
        if (!activePrediction) {
            activePrediction = await generatePrediction(selectedPlatform)
        }

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

    return (
        <Card className={`bg-slate-900 border-2 ${config.borderColor}`}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-white">
                        <Icon className={`w-6 h-6 ${config.iconColor}`} />
                        Sinal de Previsão
                    </CardTitle>
                    <Badge variant={config.badgeVariant} className="text-xs">
                        {config.label}
                    </Badge>
                </div>
                <CardDescription className="text-slate-400">
                    Análise baseada nas últimas 200 rodadas
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Confiança */}
                <div className={`rounded-lg p-4 ${config.bgColor}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-300">Nível de Confiança</span>
                        <span className={`text-2xl font-bold ${config.iconColor}`}>
                            {confidencePercent}%
                        </span>
                    </div>
                    <Progress value={confidencePercent} className="h-2" />
                </div>

                {/* Sugestão de multiplicador */}
                {prediction.suggested_range !== 'Evitar apostas' && (
                    <div className="flex items-center justify-between bg-slate-800 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-slate-300">Multiplicadores Sugeridos</span>
                        </div>
                        <span className="font-bold text-blue-400">{prediction.suggested_range}</span>
                    </div>
                )}

                {/* Razão */}
                <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-300">Análise:</div>
                    <div className="text-sm text-slate-400 bg-slate-800 rounded-lg p-3">
                        {prediction.reason}
                    </div>
                </div>

                {/* Estatísticas */}
                {prediction.analysis_data && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-800 rounded p-2">
                            <div className="text-slate-500">Velas Baixas Seguidas</div>
                            <div className="text-white font-bold">{prediction.analysis_data.low_streak}</div>
                        </div>
                        <div className="bg-slate-800 rounded p-2">
                            <div className="text-slate-500">Tempo Sem Alta</div>
                            <div className="text-white font-bold">{prediction.analysis_data.minutes_since_high}min</div>
                        </div>
                        <div className="bg-slate-800 rounded p-2">
                            <div className="text-slate-500">Média Atual</div>
                            <div className="text-white font-bold">{prediction.analysis_data.avg_multiplier}x</div>
                        </div>
                        <div className="bg-slate-800 rounded p-2">
                            <div className="text-slate-500">Alta (10x+)</div>
                            <div className="text-white font-bold">{prediction.analysis_data.distribution['10x+']}</div>
                        </div>
                    </div>
                )}

                {/* Tempo restante */}
                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800 pt-3">
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Próxima análise:</span>
                    </div>
                    <span className="font-mono">{formatTime(timeRemaining)}</span>
                </div>
            </CardContent>
        </Card>
    )
}
