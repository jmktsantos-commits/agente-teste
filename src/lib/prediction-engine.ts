import { createClient } from '@/utils/supabase/client'

export type PredictionType = 'WAIT_HIGH' | 'NORMAL' | 'CAUTION'
export type Platform = 'bravobet' | 'superbet'

export interface AnalysisData {
    low_streak: number
    minutes_since_high: number
    avg_multiplier: number
    distribution: {
        '1-2x': number
        '2-5x': number
        '5-10x': number
        '10x+': number
    }
    total_rounds: number
    last_high_multiplier?: number
    last_high_time?: string
}

export interface Prediction {
    id?: string
    created_at?: string
    platform: Platform
    prediction_type: PredictionType
    confidence: number
    suggested_range: string
    reason: string
    analysis_data: AnalysisData
    expires_at: string
    is_active?: boolean
}

interface HistoryItem {
    multiplier: number
    round_time: string
    platform: string
}

export async function generatePrediction(platform: Platform): Promise<Prediction | null> {
    const supabase = createClient()

    // Buscar últimas 200 rodadas
    const { data: history, error } = await supabase
        .from('crash_history')
        .select('multiplier, round_time, platform')
        .eq('platform', platform)
        .order('round_time', { ascending: false })
        .limit(200)

    if (error || !history || history.length === 0) {
        console.error('Erro ao buscar histórico:', error)
        return null
    }

    // Análise de padrões
    const analysis = analyzePatterns(history)

    // Gerar previsão baseada na análise
    const prediction = createPrediction(platform, analysis)

    // Salvar no banco
    const { data: saved, error: saveError } = await supabase
        .from('predictions')
        .insert(prediction)
        .select()
        .single()

    if (saveError) {
        console.error('Erro ao salvar previsão:', saveError)
    }

    return saved || prediction
}

function analyzePatterns(history: HistoryItem[]): AnalysisData {
    const multipliers = history.map(h => h.multiplier)

    // 1. Sequência de velas baixas (<2x)
    let lowStreak = 0
    for (const mult of multipliers) {
        if (mult < 2.0) {
            lowStreak++
        } else {
            break
        }
    }

    // 2. Tempo desde última vela alta (>=5x)
    const highMultipliers = history.filter(h => h.multiplier >= 5.0)
    const lastHigh = highMultipliers[0]
    const minutesSinceHigh = lastHigh
        ? (Date.now() - new Date(lastHigh.round_time).getTime()) / 60000
        : 999

    // 3. Média dos multiplicadores
    const avgMultiplier = multipliers.reduce((a, b) => a + b, 0) / multipliers.length

    // 4. Distribuição por faixa
    const distribution = {
        '1-2x': multipliers.filter(m => m >= 1 && m < 2).length,
        '2-5x': multipliers.filter(m => m >= 2 && m < 5).length,
        '5-10x': multipliers.filter(m => m >= 5 && m < 10).length,
        '10x+': multipliers.filter(m => m >= 10).length
    }

    return {
        low_streak: lowStreak,
        minutes_since_high: Math.round(minutesSinceHigh),
        avg_multiplier: Number(avgMultiplier.toFixed(2)),
        distribution,
        total_rounds: history.length,
        last_high_multiplier: lastHigh?.multiplier,
        last_high_time: lastHigh?.round_time
    }
}

function createPrediction(platform: Platform, analysis: AnalysisData): Prediction {
    let confidence = 0.0
    let predictionType: PredictionType = 'NORMAL'
    let suggestedRange = '2x - 5x'
    const reasons: string[] = []

    // Heurística 1: Sequência de velas baixas
    if (analysis.low_streak >= 15) {
        confidence += 0.35
        reasons.push(`${analysis.low_streak} velas baixas consecutivas`)
    } else if (analysis.low_streak >= 10) {
        confidence += 0.25
        reasons.push(`${analysis.low_streak} velas baixas seguidas`)
    } else if (analysis.low_streak >= 7) {
        confidence += 0.15
        reasons.push(`${analysis.low_streak} velas baixas recentes`)
    }

    // Heurística 2: Tempo sem vela alta
    if (analysis.minutes_since_high >= 60) {
        confidence += 0.30
        reasons.push(`${analysis.minutes_since_high}min sem vela alta (>=5x)`)
    } else if (analysis.minutes_since_high >= 45) {
        confidence += 0.20
        reasons.push(`${analysis.minutes_since_high}min sem vela alta`)
    } else if (analysis.minutes_since_high >= 30) {
        confidence += 0.10
        reasons.push(`${analysis.minutes_since_high}min sem vela alta`)
    }

    // Heurística 3: Média muito baixa
    if (analysis.avg_multiplier < 1.7) {
        confidence += 0.20
        reasons.push(`Média muito baixa (${analysis.avg_multiplier}x)`)
    } else if (analysis.avg_multiplier < 1.9) {
        confidence += 0.10
        reasons.push(`Média abaixo do normal (${analysis.avg_multiplier}x)`)
    }

    // Heurística 4: Distribuição anormal
    const lowPercentage = (analysis.distribution['1-2x'] / analysis.total_rounds) * 100
    if (lowPercentage > 65) {
        confidence += 0.15
        reasons.push(`${Math.round(lowPercentage)}% são velas baixas`)
    }

    // Determinar tipo de previsão
    if (confidence >= 0.65) {
        predictionType = 'WAIT_HIGH'
        suggestedRange = '3.5x - 8x'
    } else if (confidence >= 0.40) {
        predictionType = 'WAIT_HIGH'
        suggestedRange = '2.5x - 6x'
    } else if (confidence < 0.20) {
        predictionType = 'CAUTION'
        suggestedRange = 'Evitar apostas'
        if (reasons.length === 0) {
            reasons.push('Padrão irregular, aguarde')
        }
    } else {
        predictionType = 'NORMAL'
        suggestedRange = '2x - 4x'
        if (reasons.length === 0) {
            reasons.push('Comportamento normal do jogo')
        }
    }

    // Garantir que confiança não ultrapasse 1.0
    confidence = Math.min(confidence, 0.95)

    return {
        platform,
        prediction_type: predictionType,
        confidence: Number(confidence.toFixed(2)),
        suggested_range: suggestedRange,
        reason: reasons.join(', '),
        analysis_data: analysis,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // Expira em 30min
        is_active: true
    }
}

export async function getActivePrediction(platform: Platform): Promise<Prediction | null> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('platform', platform)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (error || !data) {
        return null
    }

    return data as Prediction
}
