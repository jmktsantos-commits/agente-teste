import { createClient } from '@/utils/supabase/client'

export type PredictionType = 'WAIT_HIGH' | 'NORMAL' | 'CAUTION' | 'IA_MATH'
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
    next_analysis_at?: string
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

    // DEDUPLICATION: Check if a prediction was already created in the current hour
    const now = new Date()
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0)
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)

    const { data: existing } = await supabase
        .from('predictions')
        .select('id, created_at')
        .eq('platform', platform)
        .gte('created_at', hourStart.toISOString())
        .lt('created_at', hourEnd.toISOString())
        .limit(1)

    if (existing && existing.length > 0) {
        console.log(`[DEDUP] Prediction already exists for ${platform} at hour ${now.getHours()}:00`)
        return null
    }

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

    let minutesSinceHigh = 999
    if (lastHigh && lastHigh.round_time) {
        const lastHighTime = new Date(lastHigh.round_time).getTime()
        if (!isNaN(lastHighTime)) {
            minutesSinceHigh = (Date.now() - lastHighTime) / 60000
        }
    }

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
        minutes_since_high: Math.max(0, Math.round(minutesSinceHigh)), // Prevent negative or NaN
        avg_multiplier: isNaN(avgMultiplier) ? 0 : Number(avgMultiplier.toFixed(2)),
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
    if (analysis.total_rounds > 0) {
        const lowPercentage = (analysis.distribution['1-2x'] / analysis.total_rounds) * 100
        if (lowPercentage > 65) {
            confidence += 0.15
            reasons.push(`${Math.round(lowPercentage)}% são velas baixas`)
        }
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
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Expira em 60min
        is_active: true
    }
}

export async function getRecentPredictions(platform: Platform, limit: number = 3): Promise<Prediction[]> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('platform', platform)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('[getRecentPredictions] Error fetching predictions:', error)
        return []
    }

    console.log(`[getRecentPredictions] Found ${data?.length || 0} predictions for ${platform}`)
    return (data as Prediction[]) || []
}

export function getNextAnalysisTime(platform: Platform): Date {
    // Usar fuso horário de São Paulo
    const now = new Date()
    const spTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const hour = spTime.getHours()
    const isEvenHour = hour % 2 === 0

    // Regra:
    // Horas Pares (00, 02, ... 12) -> Bravobet
    // Horas Ímpares (01, 03, ... 13) -> Superbet

    let nextTime = new Date(now)
    // Ajustar nextTime mantendo o mesmo desfase do SP time

    // Simplificação: apenas calcular o próximo alvo em SP time e converter de volta se necessário
    // Mas para display, o frontend usa o objeto Date local do usuário.
    // O importante é a lógica de par/impar bater com o SP time.

    nextTime.setMinutes(0, 0, 0)

    if (platform === 'bravobet') {
        if (isEvenHour) {
            return nextTime
        } else {
            nextTime.setHours(nextTime.getHours() + 1)
            return nextTime
        }
    } else { // superbet
        if (!isEvenHour) {
            return nextTime
        } else {
            nextTime.setHours(nextTime.getHours() + 1)
            return nextTime
        }
    }
}

export function isPlatformWindowActive(platform: Platform): boolean {
    // Usar fuso horário de São Paulo para verificação
    const now = new Date()
    const spTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const hour = spTime.getHours()

    const isEven = hour % 2 === 0
    if (platform === 'bravobet') return isEven
    return !isEven
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
