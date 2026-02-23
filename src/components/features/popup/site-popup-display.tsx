"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { X, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

type PopupPosition = "bottom-right" | "top" | "center"

interface SitePopup {
    id: string
    type: "text" | "image"
    content: string | null
    image_url: string | null
    link_url: string | null
    title: string | null
    target: "all" | "specific"
    target_lead_ids: string[] | null
    status: string
    position: PopupPosition
    created_at: string
    expires_at: string | null
}

interface SitePopupDisplayProps {
    leadId?: string
}

export function SitePopupDisplay({ leadId }: SitePopupDisplayProps) {
    const [current, setCurrent] = useState<SitePopup | null>(null)
    const [animIn, setAnimIn] = useState(false)
    const queue = useRef<SitePopup[]>([])
    const seenIds = useRef<Set<string>>(new Set())
    const currentIdRef = useRef<string | null>(null)
    const supabase = createClient()

    // Load persisted dismissed popup IDs from localStorage on mount
    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('dismissed_popups') || '[]')
            stored.forEach((id: string) => seenIds.current.add(id))
        } catch { }
    }, [])

    const showPopup = (popup: SitePopup) => {
        currentIdRef.current = popup.id
        setCurrent(popup)
        requestAnimationFrame(() => requestAnimationFrame(() => setAnimIn(true)))
        // Deduplicate view events per session (prevents React Strict Mode double-mount duplicates)
        const viewKey = `popup_view_${popup.id}`
        if (typeof window !== "undefined" && !sessionStorage.getItem(viewKey)) {
            sessionStorage.setItem(viewKey, "1")
            fetch("/api/crm/popup/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ popup_id: popup.id, event_type: "view" }),
            }).catch(() => { })
        }
    }

    const dismiss = (persist = true) => {
        const dismissedId = currentIdRef.current
        currentIdRef.current = null
        setAnimIn(false)
        // Persist dismissed ID so it never reappears after page refresh
        if (persist && dismissedId) {
            try {
                const stored = JSON.parse(localStorage.getItem('dismissed_popups') || '[]')
                if (!stored.includes(dismissedId)) {
                    localStorage.setItem('dismissed_popups', JSON.stringify([...stored, dismissedId]))
                }
            } catch { }
        }
        setTimeout(() => {
            setCurrent(null)
            const next = queue.current.shift()
            if (next) setTimeout(() => showPopup(next), 200)
        }, 350)
    }

    const enqueue = (popup: SitePopup) => {
        if (seenIds.current.has(popup.id)) return
        if (popup.status !== "active") return
        if (popup.expires_at && new Date(popup.expires_at) < new Date()) return
        if (popup.target === "specific" && leadId && !popup.target_lead_ids?.includes(leadId)) return

        seenIds.current.add(popup.id)

        setCurrent(prev => {
            if (!prev) {
                // Nothing showing → show immediately
                setTimeout(() => showPopup(popup), 10)
                return null
            }
            queue.current.push(popup)
            return prev
        })
    }

    useEffect(() => {
        // Initial fetch: load currently active popups (ignores expired/dismissed)
        fetch("/api/crm/popup?activeOnly=true")
            .then(r => r.json())
            .then((data: SitePopup[]) => { if (Array.isArray(data)) data.slice(0, 3).forEach(enqueue) })
            .catch(() => { })

        const supabaseClient = supabase

        const channel = supabaseClient
            .channel("site_popups_display")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "site_popups" },
                (payload) => {
                    const p = payload.new as SitePopup
                    enqueue(p)
                }
            )
            .on(
                "postgres_changes",
                // No filter: we need to know when status changes TO dismissed/expired too
                { event: "UPDATE", schema: "public", table: "site_popups" },
                (payload) => {
                    const p = payload.new as SitePopup
                    const isInactive = p.status === "dismissed" || p.status === "expired"

                    if (isInactive) {
                        // Remove from queue if waiting
                        queue.current = queue.current.filter(q => q.id !== p.id)
                        // If currently on screen → dismiss immediately (safe: using ref, not state)
                        if (currentIdRef.current === p.id) {
                            dismiss()
                        }
                    } else {
                        // Active or re-activated → try to enqueue
                        enqueue(p)
                    }
                }
            )
            .subscribe()

        return () => { supabaseClient.removeChannel(channel) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leadId])

    if (!current) return null

    const pos = current.position ?? "bottom-right"
    const isImage = current.type === "image"

    // ── Wrapper classes by position ──────────────────────────────────────────
    const wrapperClass = cn(
        "fixed z-[9999] transition-all duration-350 ease-out",
        // Center: full-screen backdrop
        pos === "center" && [
            "inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm",
            animIn ? "opacity-100" : "opacity-0 pointer-events-none",
        ],
        // Top: full-width banner
        pos === "top" && [
            "top-0 left-0 right-0 w-full",
            animIn ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0",
        ],
        // Bottom-right: small card
        pos === "bottom-right" && [
            "bottom-6 right-6 w-80 max-w-[calc(100vw-2rem)]",
            animIn ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
        ]
    )

    // ── Card classes by position ─────────────────────────────────────────────
    const cardClass = cn(
        "relative overflow-hidden bg-background border shadow-2xl",
        pos === "center" && "rounded-2xl w-full max-w-md mx-4 shadow-[0_25px_60px_rgba(0,0,0,0.5)]",
        pos === "top" && "rounded-none border-x-0 border-t-0 w-full",
        pos === "bottom-right" && "rounded-2xl",
    )

    const accentBar = (
        <div className="h-1 w-full bg-gradient-to-r from-purple-600 to-pink-600" />
    )

    const closeBtn = (
        <button
            onClick={dismiss}
            className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/25 transition-colors"
            aria-label="Fechar"
        >
            <X className="w-4 h-4" />
        </button>
    )

    const imageContent = isImage && current.image_url ? (
        current.link_url ? (
            <a href={current.link_url} target="_blank" rel="noopener noreferrer"
                onClick={() => {
                    // Track click
                    fetch("/api/crm/popup/events", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ popup_id: current.id, event_type: "click" }),
                    }).catch(() => { })
                    dismiss()
                }}>
                <img
                    src={current.image_url} alt={current.title ?? "Pop-up"}
                    className={cn("w-full object-cover", pos === "top" ? "max-h-20" : "max-h-72")}
                />
                {current.title && (
                    <div className="px-5 py-3 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{current.title}</p>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </div>
                )}
            </a>
        ) : (
            <>
                <img
                    src={current.image_url} alt={current.title ?? "Pop-up"}
                    className={cn("w-full object-cover", pos === "top" ? "max-h-20" : "max-h-72")}
                />
                {current.title && <div className="px-5 py-3"><p className="text-sm font-semibold">{current.title}</p></div>}
            </>
        )
    ) : null

    const textContent = !isImage ? (
        <div className={cn("px-5", pos === "top" ? "py-3 flex items-center justify-center gap-4 text-center" : "py-5")}>
            {current.title && <p className={cn("font-bold text-foreground", pos === "top" ? "text-sm shrink-0" : "text-sm mb-2")}>{current.title}</p>}
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{current.content}</p>
        </div>
    ) : null

    return (
        <div className={wrapperClass} role="dialog" aria-modal={pos === "center"}>
            {pos === "center" && (
                <div className="absolute inset-0" onClick={dismiss} aria-hidden />
            )}
            <div className={cardClass}>
                {closeBtn}
                {pos !== "top" && accentBar}
                {isImage ? imageContent : textContent}
                {pos === "top" && accentBar}
            </div>
        </div>
    )
}
