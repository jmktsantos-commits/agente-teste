import { NextRequest, NextResponse } from 'next/server'
import { generatePrediction, type Platform } from '@/lib/prediction-engine'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Cron endpoint to automatically generate predictions every hour
 * Alternates between platforms based on even/odd hour
 * 
 * Even hours (00, 02, 04, ..., 22) → Bravobet
 * Odd hours (01, 03, 05, ..., 23) → Superbet
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
    const isEven = hour % 2 === 0

    // Determine which platform to analyze based on hour parity
    const platform: Platform = isEven ? 'bravobet' : 'superbet'

    console.log(`[CRON] ${now.toISOString()} | Hour: ${hour}:${minute.toString().padStart(2, '0')} | Analyzing: ${platform}`)

    try {
        // Generate prediction for the active platform
        const prediction = await generatePrediction(platform)

        if (prediction) {
            console.log(`[CRON] ✅ Prediction created: ${prediction.id} | Type: ${prediction.prediction_type} | Confidence: ${Math.round(prediction.confidence * 100)}%`)

            return NextResponse.json({
                success: true,
                platform,
                hour,
                timestamp: now.toISOString(),
                prediction: {
                    id: prediction.id,
                    type: prediction.prediction_type,
                    confidence: prediction.confidence,
                    suggested_range: prediction.suggested_range
                }
            })
        } else {
            console.warn(`[CRON] ⚠️ No prediction generated for ${platform}`)

            return NextResponse.json({
                success: false,
                platform,
                hour,
                timestamp: now.toISOString(),
                error: 'No prediction generated (insufficient data or error)'
            }, { status: 500 })
        }
    } catch (error) {
        console.error('[CRON] ❌ Error generating prediction:', error)

        return NextResponse.json({
            success: false,
            platform,
            hour,
            timestamp: now.toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
