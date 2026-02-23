"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Prediction = {
    id: number
    platform: string
    created_at: string
    expires_at: string
    is_active: boolean
    suggested_range: string
    prediction_type: string
    confidence: number
}

export default function DebugPredictionsPage() {
    const [bravobetPreds, setBravobetPreds] = useState<Prediction[]>([])
    const [superbetPreds, setSuperbetPreds] = useState<Prediction[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchPredictions() {
            const supabase = createClient()

            // Fetch last 5 predictions for each platform
            const { data: bravobet } = await supabase
                .from('predictions')
                .select('*')
                .eq('platform', 'bravobet')
                .order('created_at', { ascending: false })
                .limit(5)

            const { data: superbet } = await supabase
                .from('predictions')
                .select('*')
                .eq('platform', 'superbet')
                .order('created_at', { ascending: false })
                .limit(5)

            setBravobetPreds(bravobet || [])
            setSuperbetPreds(superbet || [])
            setLoading(false)
        }

        fetchPredictions()
        const interval = setInterval(fetchPredictions, 5000) // Refresh every 5s

        return () => clearInterval(interval)
    }, [])

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            dateStyle: 'short',
            timeStyle: 'medium'
        })
    }

    const isExpired = (expiresAt: string) => {
        return new Date(expiresAt) < new Date()
    }

    if (loading) {
        return <div className="p-8 text-white">Carregando...</div>
    }

    return (
        <div className="p-8 space-y-6 bg-slate-950 min-h-screen">
            <h1 className="text-3xl font-bold text-white">Debug - Últimas Previsões</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bravobet */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">Bravobet - Últimas 5</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {bravobetPreds.map(pred => (
                            <div key={pred.id} className={`p-4 rounded-lg border ${pred.is_active ? 'bg-green-900/20 border-green-700' : 'bg-slate-800 border-slate-700'}`}>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">ID:</span>
                                        <span className="text-white font-mono">{pred.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Criado:</span>
                                        <span className="text-white font-mono">{formatDate(pred.created_at)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Expira:</span>
                                        <span className={`font-mono ${isExpired(pred.expires_at) ? 'text-red-400' : 'text-green-400'}`}>
                                            {formatDate(pred.expires_at)}
                                            {isExpired(pred.expires_at) ? ' (EXPIRADO)' : ' (OK)'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Ativo:</span>
                                        <span className={pred.is_active ? 'text-green-400' : 'text-red-400'}>
                                            {pred.is_active ? 'SIM' : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Tipo:</span>
                                        <span className="text-white">{pred.prediction_type}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Confiança:</span>
                                        <span className="text-white">{(pred.confidence * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Horários:</span>
                                        <span className="text-white font-mono">{pred.suggested_range}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {bravobetPreds.length === 0 && (
                            <div className="text-slate-500 text-center py-8">Nenhuma previsão encontrada</div>
                        )}
                    </CardContent>
                </Card>

                {/* Superbet */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white">Superbet - Últimas 5</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {superbetPreds.map(pred => (
                            <div key={pred.id} className={`p-4 rounded-lg border ${pred.is_active ? 'bg-green-900/20 border-green-700' : 'bg-slate-800 border-slate-700'}`}>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">ID:</span>
                                        <span className="text-white font-mono">{pred.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Criado:</span>
                                        <span className="text-white font-mono">{formatDate(pred.created_at)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Expira:</span>
                                        <span className={`font-mono ${isExpired(pred.expires_at) ? 'text-red-400' : 'text-green-400'}`}>
                                            {formatDate(pred.expires_at)}
                                            {isExpired(pred.expires_at) ? ' (EXPIRADO)' : ' (OK)'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Ativo:</span>
                                        <span className={pred.is_active ? 'text-green-400' : 'text-red-400'}>
                                            {pred.is_active ? 'SIM' : 'NÃO'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Tipo:</span>
                                        <span className="text-white">{pred.prediction_type}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Confiança:</span>
                                        <span className="text-white">{(pred.confidence * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Horários:</span>
                                        <span className="text-white font-mono">{pred.suggested_range}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {superbetPreds.length === 0 && (
                            <div className="text-slate-500 text-center py-8">Nenhuma previsão encontrada</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="text-slate-400 text-sm">
                <p>Atualização automática a cada 5 segundos</p>
                <p>Hora atual do sistema: {new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
            </div>
        </div>
    )
}
