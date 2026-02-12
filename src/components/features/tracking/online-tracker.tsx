"use client"

import { useEffect } from "react"
import { createClient } from "@/utils/supabase/client"

export function OnlineTracker() {
    const supabase = createClient()

    useEffect(() => {
        const updatePresence = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            await supabase
                .from("profiles")
                .update({ last_seen: new Date().toISOString() })
                .eq("id", user.id)
        }

        // Update immediately
        updatePresence()

        // Update every 2 minutes
        const interval = setInterval(updatePresence, 2 * 60 * 1000)

        // Also update on visibility change (tab focus)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updatePresence()
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange)

        return () => {
            clearInterval(interval)
            document.removeEventListener("visibilitychange", handleVisibilityChange)
        }
    }, [supabase])

    return null // Invisible component
}
