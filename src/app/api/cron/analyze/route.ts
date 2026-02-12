import { NextRequest, NextResponse } from 'next/server'
import { generatePrediction, type Platform } from '@/lib/prediction-engine'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Cron endpoint to automatically generate predictions every hour
 * Analyzes BOTH platforms (Bravobet AND Superbet) in each execution
 */
export async function GET(request: NextRequest) {
    // Security: Verify cron secret
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
        console.error('[CRON] Unauthorized access attempt')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    // Use Sao Paulo timezone for consistency
    const spTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const hour = spTime.getHours()
    const minute = spTime.getMinutes()

    console.log(`[CRON] ${now.toISOString()} | Hour: ${hour}:${minute.toString().padStart(2, '0')} | Analyzing: BOTH platforms`)

    // Analyze BOTH platforms simultaneously
    const platforms: Platform[] = ['bravobet', 'superbet']

    try {
        const results = await Promise.allSettled(
            platforms.map(platform => generatePrediction(platform))
        )

        const predictions = results.map((result, index) => {
            const platform = platforms[index]

            if (result.status === 'fulfilled' && result.value) {
                const pred = result.value
                console.log(`[CRON] ✅ ${platform}: Prediction created | ID: ${pred.id} | Type: ${pred.prediction_type} | Confidence: ${Math.round(pred.confidence * 100)}%`)

                return {
                    platform,
                    success: true,
                    prediction: {
                        id: pred.id,
                        type: pred.prediction_type,
                        confidence: pred.confidence,
                        suggested_range: pred.suggested_range
                    }
                }
            } else {
                const error = result.status === 'rejected' ? result.reason : 'No prediction generated'
                console.warn(`[CRON] ⚠️ ${platform}: ${error}`)

                return {
                    platform,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                }
            }
        })

        const successCount = predictions.filter(p => p.success).length
        const allSuccess = successCount === platforms.length

        return NextResponse.json({
            success: allSuccess,
            timestamp: now.toISOString(),
            hour,
            platforms: predictions,
            summary: `${successCount}/${platforms.length} platforms analyzed successfully`
        }, { status: allSuccess ? 200 : 207 }) // 207 = Multi-Status (partial success)

    } catch (error) {
        console.error('[CRON] ❌ Critical error:', error)

        return NextResponse.json({
            success: false,
            timestamp: now.toISOString(),
            hour,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
