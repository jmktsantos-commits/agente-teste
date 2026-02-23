/**
 * Casino Analytics Tracking
 * 
 * Track user interactions with casino platforms for conversion analysis
 */

import { createClient } from '@/utils/supabase/client'
import type { CasinoPlatform } from '@/lib/casino-config'

export interface CasinoClickEvent {
    platform: CasinoPlatform
    user_id?: string
    source: 'casino_page' | 'signal_card' | 'dashboard'
    timestamp: string
}

/**
 * Track casino click event
 */
export async function trackCasinoClick(event: Omit<CasinoClickEvent, 'timestamp'>) {
    try {
        const supabase = createClient()

        // Get current user if authenticated
        const { data: { user } } = await supabase.auth.getUser()

        const clickData = {
            platform: event.platform,
            user_id: user?.id || event.user_id,
            source: event.source,
            timestamp: new Date().toISOString(),
            session_id: getSessionId()
        }

        // Store in Supabase (you'll need to create this table)
        // For now, just log to console
        console.log('[Casino Analytics]', clickData)

        // TODO: Uncomment after creating casino_clicks table
        // await supabase.from('casino_clicks').insert(clickData)

        // Also track in localStorage for anonymous users
        trackInLocalStorage('casino_click', clickData)

    } catch (error) {
        console.error('[Casino Analytics] Error tracking click:', error)
    }
}

/**
 * Get or create session ID for anonymous tracking
 */
function getSessionId(): string {
    const storageKey = 'aviator_session_id'
    let sessionId = localStorage.getItem(storageKey)

    if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
        localStorage.setItem(storageKey, sessionId)
    }

    return sessionId
}

/**
 * Track event in localStorage for offline/anonymous users
 */
function trackInLocalStorage(eventType: string, data: any) {
    try {
        const key = 'casino_analytics'
        const existing = JSON.parse(localStorage.getItem(key) || '[]')

        existing.push({
            type: eventType,
            data,
            tracked_at: new Date().toISOString()
        })

        // Keep only last 50 events
        const trimmed = existing.slice(-50)
        localStorage.setItem(key, JSON.stringify(trimmed))
    } catch (error) {
        // Ignore localStorage errors
    }
}

/**
 * Get user's preferred platform (last clicked)
 */
export function getPreferredPlatform(): CasinoPlatform | null {
    try {
        return localStorage.getItem('preferred_casino') as CasinoPlatform | null
    } catch {
        return null
    }
}

/**
 * Set user's preferred platform
 */
export function setPreferredPlatform(platform: CasinoPlatform) {
    try {
        localStorage.setItem('preferred_casino', platform)
    } catch {
        // Ignore localStorage errors
    }
}

/**
 * Get casino analytics summary
 */
export function getCasinoAnalyticsSummary() {
    try {
        const data = JSON.parse(localStorage.getItem('casino_analytics') || '[]')

        const clicksByPlatform = data.reduce((acc: any, event: any) => {
            if (event.type === 'casino_click') {
                const platform = event.data.platform
                acc[platform] = (acc[platform] || 0) + 1
            }
            return acc
        }, {})

        return {
            totalClicks: data.filter((e: any) => e.type === 'casino_click').length,
            clicksByPlatform,
            preferredPlatform: getPreferredPlatform()
        }
    } catch {
        return { totalClicks: 0, clicksByPlatform: {}, preferredPlatform: null }
    }
}
