"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Clock, Target, Rocket, History, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import {
    getActivePrediction,
    generatePrediction,
    getRecentPredictions,
    getNextAnalysisTime,
    isPlatformWindowActive,
    type Prediction,
    type Platform
} from "@/lib/prediction-engine"

interface SignalCardProps {
    selectedPlatform: Platform
}

export function SignalCard({ selectedPlatform }: SignalCardProps) {
    const platform = selectedPlatform
    const [prediction, setPrediction] = useState<Prediction | null>(null)
    const [lastPredictions, setLastPredictions] = useState<Prediction[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [nextAnalysis, setNextAnalysis] = useState<Date | null>(null)
    const [countdown, setCountdown] = useState<string>("")

    const isWindowActive = isPlatformWindowActive(platform)

    useEffect(() => {
        loadPrediction()
        const interval = setInterval(loadPrediction, 30000)
        return () => clearInterval(interval)
    }, [platform])

    useEffect(() => {
        const next = getNextAnalysisTime(platform)
        setNextAnalysis(next)

        const countdownInterval = setInterval(() => {
            const now = new Date()
            let targetTime = next.getTime()

            // If we're in the current window (diff <= 0), show time to NEXT window (2h later)
            const diff = targetTime - now.getTime()
            if (diff <= 0) {
                targetTime = targetTime + (2 * 60 * 60 * 1000) // Add 2 hours
            }

            const finalDiff = targetTime - now.getTime()
            const hours = Math.floor(finalDiff / (1000 * 60 * 60))
            const minutes = Math.floor((finalDiff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((finalDiff % (1000 * 60)) / 1000)
            setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
        }, 1000)

        return () => clearInterval(countdownInterval)
    }, [platform])

    async function loadPrediction() {
        setIsLoading(true)
        const active = await getActivePrediction(platform)
        setPrediction(active)
        setIsLoading(false)

        const recent = await getRecentPredictions(platform, 3)
        setLastPredictions(recent)
    }

    // Helper function to parse and fix malformed time formats
    // Handles cases like "00:23:40" (should be "00:40") or "23:15" (correct format)
    const parseTimeFormat = (timeStr: string): string => {
        // Remove any "+ X min" suffix
        const cleanTime = timeStr.replace(/\s*\+\s*\d+\s*min/gi, '').trim()

        // Check if it's in HH:MM:SS format (malformed)
        const parts = cleanTime.split(':')

        if (parts.length === 3) {
            // Format: HH:MM:SS - extract HH and SS as the actual time
            const hour = parts[0]
            const seconds = parts[2]
            return `${hour}:${seconds}`
        } else if (parts.length === 2) {
            // Format: HH:MM - already correct
            return cleanTime
        }

        // Fallback: return as-is
        return cleanTime
    }

    // Helper to check if a time string (HH:MM) is in the future relative to now
    const isTimeInFuture = (timeStr: string): boolean => {
        try {
            const now = new Date()
            const [hours, minutes] = timeStr.split(':').map(Number)

            if (isNaN(hours) || isNaN(minutes)) return true // Keep if invalid format to be safe

            const target = new Date()
            target.setHours(hours, minutes, 0, 0)

            // Handle day rollover edge case: 
            // If now is 23:50 and target is 00:10, target (today 00:10) < now, but it means tomorrow.
            // Assumption: Predictions are typically for the current or next hour.
            // If target is significantly in the past (e.g. > 20 hours ago), assume it's for tomorrow.
            // But usually we just want to filter times within the current session that passed.

            // Simple check: if target is in the past by less than 12 hours, filter it out.
            // If it's "in the past" by > 12 hours (e.g. target 00:10, now 23:50 -> 23h difference), treat as tomorrow (future).

            const diffMs = now.getTime() - target.getTime()

            if (diffMs > 0 && diffMs < 12 * 60 * 60 * 1000) {
                return false // It's in the past (within last 12h)
            }

            return true
        } catch (e) {
            return true
        }
    }

    const suggestedTimes = prediction?.suggested_range
        ?.split(',')
        .map(t => parseTimeFormat(t.trim()))
        .filter(t => t !== "")
        .filter(t => isTimeInFuture(t)) || []

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full space-y-4"
        >
            <Card className="w-full bg-slate-900 border-slate-800 text-white overflow-hidden relative shadow-2xl shadow-purple-900/10">
                <div className={`absolute top-0 left-0 w-1 h-full ${isWindowActive ? 'bg-pink-500' : 'bg-slate-600'}`} />

                <CardContent className="p-6">
                    <div className="flex flex-row gap-6 items-center justify-between">

                        {/* 1. 10x Section - SEMPRE VISÍVEL */}
                        <div className="flex flex-col items-center gap-1">
                            <div className="text-5xl md:text-6xl font-sans font-black tracking-tight text-white drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]">
                                10.00x<span className="text-pink-500 text-3xl align-top">+</span>
                            </div>
                            {isWindowActive && prediction ? (
                                <Badge variant="outline" className="mt-1 border-green-500/50 text-green-400 bg-green-500/10 text-xs">
                                    ATIVO
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="mt-1 border-slate-600 text-slate-500 bg-slate-800 text-xs">
                                    AGUARDANDO
                                </Badge>
                            )}
                        </div>

                        {/* 2. Análise da Vela Section - SEMPRE VISÍVEL */}
                        <div className="flex flex-col items-center gap-2 flex-1">
                            {isWindowActive && suggestedTimes.length > 0 && !suggestedTimes.join('').includes('Evitar apostas') ? (
                                <>
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Horários Confirmados</span>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {[...suggestedTimes].sort().map((time, idx) => (
                                            <div key={idx} className="bg-white text-black px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg shadow-white/10 animate-in fade-in zoom-in duration-300">
                                                <Clock className="w-3.5 h-3.5 text-black" />
                                                <span className="font-bold font-mono text-sm">{time}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : isWindowActive && suggestedTimes.length === 0 ? (
                                <>
                                    {lastPredictions.length > 0 && lastPredictions[0].suggested_range ? (
                                        <>
                                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Última Análise</span>
                                            <div className="flex flex-wrap justify-center gap-2">
                                                {lastPredictions[0].suggested_range.split(',').sort().map((timeRange, idx) => {
                                                    const fixedTime = parseTimeFormat(timeRange.trim());
                                                    return (
                                                        <div key={idx} className="bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg opacity-70">
                                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                            <span className="font-bold font-mono text-sm">{fixedTime}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-xs text-green-400 font-bold uppercase tracking-wider animate-pulse flex items-center gap-2">
                                                <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                                                Analisando Mercado...
                                            </span>
                                            <div className="text-lg text-slate-400 font-medium">
                                                Aguardando Padrão 10x
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    {lastPredictions.length > 0 && lastPredictions[0].suggested_range ? (
                                        <>
                                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Última Análise</span>
                                            <div className="flex flex-wrap justify-center gap-2">
                                                {lastPredictions[0].suggested_range.split(',').sort().map((timeRange, idx) => {
                                                    const fixedTime = parseTimeFormat(timeRange.trim());
                                                    return (
                                                        <div key={idx} className="bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg opacity-70">
                                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                            <span className="font-bold font-mono text-sm">{fixedTime}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                                                Janela Inativa
                                            </span>
                                            <div className="text-lg text-slate-400 font-medium">
                                                Aguarde a próxima análise
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>

                        {/* 3. Countdown Section - SEMPRE VISÍVEL */}
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                                {isWindowActive && suggestedTimes.length > 0 ? "Próxima Análise" : "Próxima Análise Em"}
                            </span>
                            <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800/50">
                                <Clock className="w-5 h-5 text-slate-500" />
                                <span className="text-2xl font-mono font-bold text-slate-300 tracking-wider">
                                    {countdown || "00:00:00"}
                                </span>
                            </div>
                        </div>

                        {/* 4. Button Section - SEMPRE VISÍVEL */}
                        <div className="flex flex-col items-end gap-2">
                            <Button
                                className="w-[200px] bg-gradient-to-r from-pink-600 via-pink-500 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-black h-12 text-base shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all hover:scale-105 active:scale-95 uppercase tracking-wide border-0"
                                onClick={() => {
                                    const url = platform === 'superbet'
                                        ? "https://brsuperbet.com/registro_7330"
                                        : "https://affiliates.bravo.bet.br/links/?accounts=%2A&register=%2A&btag=1989135_l350155__"
                                    window.open(url, '_blank')
                                }}
                            >
                                <Rocket className="mr-2 h-5 w-5" />
                                ABRIR {platform === 'superbet' ? 'SUPERBET' : 'BRAVOBET'}
                            </Button>
                        </div>

                    </div>
                </CardContent>
            </Card>

            {/* Histórico de Sessões Recentes */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white mb-4">
                    <History className="w-5 h-5 text-pink-500" />
                    <span className="text-sm font-bold uppercase tracking-wider">Últimas 3 Sessões</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {lastPredictions.length > 0 ? (
                        lastPredictions.map((pred, idx) => {
                            const isFirst = idx === 0
                            return (
                                <div
                                    key={pred.id}
                                    className={`bg-slate-800/50 border ${isFirst ? 'border-green-500/30' : 'border-slate-700'} rounded-lg p-3 transition-all hover:border-pink-500/30`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-xs font-mono flex items-center gap-1 ${isFirst ? 'text-green-400 font-bold' : 'text-slate-500'}`}>
                                            <Clock className="w-3 h-3" />
                                            {new Date(pred.created_at || "").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {isFirst && <span className="ml-2 bg-green-500/20 text-green-400 text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider">Atual</span>}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1 mt-1">
                                        {pred.suggested_range.split(',').sort().map((timeRange, idx) => {
                                            const fixedTime = parseTimeFormat(timeRange.trim());
                                            return (
                                                <div key={idx} className="bg-yellow-500 text-black px-3 py-1 rounded shadow-md font-bold text-sm text-center">
                                                    {fixedTime}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <div className="col-span-3 text-center text-slate-500 py-4">
                            Nenhuma sessão recente encontrada
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    )
}
