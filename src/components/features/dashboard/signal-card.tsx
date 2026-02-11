"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Clock, Target, Rocket } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface SignalCardProps {
    prediction: {
        id: string
        time: string
        confidence: "high" | "medium" | "low"
        platform: string
        target_multiplier?: number
    }
}

export function SignalCard({ prediction }: SignalCardProps) {
    const [timeLeft, setTimeLeft] = useState<string>("")

    // Mock countdown logic specifically for demo
    useEffect(() => {
        const timer = setInterval(() => {
            // Calculate time left from prediction.time
            // For now just mock random seconds
            setTimeLeft("00:45")
        }, 1000)
        return () => clearInterval(timer)
    }, [prediction.time])

    const confidenceColors = {
        high: "bg-green-500 hover:bg-green-600",
        medium: "bg-yellow-500 hover:bg-yellow-600",
        low: "bg-red-500 hover:bg-red-600",
    }

    const confidenceLabels = {
        high: "Alta Confiança",
        medium: "Média Confiança",
        low: "Baixa Confiança",
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="w-full bg-slate-900 border-slate-800 text-white overflow-hidden relative">
                <div className={`absolute top-0 left-0 w-1 h-full ${confidenceColors[prediction.confidence].replace("hover:bg-", "bg-")}`} />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Entrada Sugerida: <span className="text-white text-lg font-bold">{prediction.time}</span>
                    </CardTitle>
                    <Badge className={`${confidenceColors[prediction.confidence]} text-white border-0`}>
                        {confidenceLabels[prediction.confidence]}
                    </Badge>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center space-y-4 py-4">
                        <div className="text-4xl font-black font-mono tracking-wider flex items-center gap-2">
                            <Target className="w-8 h-8 text-primary" />
                            {prediction.target_multiplier?.toFixed(2)}x
                        </div>
                        <div className="text-sm text-slate-400">
                            Plataforma: <span className="text-white font-semibold">{prediction.platform}</span>
                        </div>

                        <Button className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-bold h-12 shadow-lg shadow-primary/20 animate-pulse">
                            <Rocket className="mr-2 h-5 w-5" />
                            JOGAR AGORA
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
