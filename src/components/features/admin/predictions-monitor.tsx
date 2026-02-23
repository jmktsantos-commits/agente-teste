"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"

type Prediction = {
    id: number
    platform: string
    created_at: string
    expires_at: string
    is_active: boolean
    suggested_range: string
    confidence: number
}

export function PredictionsMonitor() {
    const [predictions, setPredictions] = useState<{ bravobet: Prediction[], superbet: Prediction[] }>({
        bravobet: [],
        superbet: []
    })

    useEffect(() => {
        async function fetchPredictions() {
            const supabase = createClient()

            const { data: bravobet } = await supabase
                .from('predictions')
                .select('*')
                .eq('platform', 'bravobet')
                .order('created_at', { ascending: false })
                .limit(3)

            const { data: superbet } = await supabase
                .from('predictions')
                .select('*')
                .eq('platform', 'superbet')
                .order('created_at', { ascending: false })
                .limit(3)

            setPredictions({
                bravobet: bravobet || [],
                superbet: superbet || []
            })
        }

        fetchPredictions()
        const interval = setInterval(fetchPredictions, 10000) // Update every 10s

        return () => clearInterval(interval)
    }, [])

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const isExpired = (expiresAt: string) => {
        return new Date(expiresAt) < new Date()
    }

    const renderPrediction = (pred: Prediction) => {
        const expired = isExpired(pred.expires_at)

        return (
            <div key={pred.id} className={`p-3 rounded-lg border transition-all ${pred.is_active && !expired
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-slate-800/50 border-slate-700/50'
                }`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {pred.is_active && !expired ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : expired ? (
                            <XCircle className="w-4 h-4 text-slate-500" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className="text-xs font-medium text-slate-400">
                            ID: {pred.id}
                        </span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${pred.is_active && !expired
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-slate-700 text-slate-400'
                        }`}>
                        {pred.is_active && !expired ? 'ATIVA' : expired ? 'EXPIRADA' : 'INATIVA'}
                    </span>
                </div>

                <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Criado:</span>
                        <span className="text-slate-300 font-mono">{formatTime(pred.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Expira:</span>
                        <span className={`font-mono ${expired ? 'text-red-400' : 'text-green-400'}`}>
                            {formatTime(pred.expires_at)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Confiança:</span>
                        <span className="text-slate-300">{(pred.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-700/50">
                        <span className="text-slate-500 block mb-1">Horários:</span>
                        <span className="text-white font-mono text-xs">{pred.suggested_range}</span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        Bravobet - Últimas 3
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {predictions.bravobet.length > 0 ? (
                        predictions.bravobet.map(renderPrediction)
                    ) : (
                        <div className="text-slate-500 text-center py-6 text-sm">
                            Nenhuma previsão encontrada
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        Superbet - Últimas 3
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {predictions.superbet.length > 0 ? (
                        predictions.superbet.map(renderPrediction)
                    ) : (
                        <div className="text-slate-500 text-center py-6 text-sm">
                            Nenhuma previsão encontrada
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
