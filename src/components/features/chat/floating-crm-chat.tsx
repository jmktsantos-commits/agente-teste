"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MessageCircle, X, Send, Volume2, VolumeX, Paperclip, Image as ImageIcon, Mic, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/client"
import { ChatWindow } from "./chat-window"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface CRMMessage {
    id: string
    content: string
    content_type?: string
    direction: "inbound" | "outbound"
    created_at: string
}

type Tab = "specialist" | "global"

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Singleton AudioContext — created lazily on first use
let _audioCtx: AudioContext | null = null
function getAudioCtx(): AudioContext | null {
    if (typeof window === "undefined") return null
    if (!_audioCtx) {
        _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (_audioCtx.state === "suspended") {
        _audioCtx.resume().catch(() => { })
    }
    return _audioCtx
}

function playNotificationSound() {
    try {
        const ctx = getAudioCtx()
        if (!ctx) return
        // Two-tone ding
        const playTone = (freq: number, startTime: number, duration: number) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain); gain.connect(ctx.destination)
            osc.type = "sine"
            osc.frequency.setValueAtTime(freq, startTime)
            gain.gain.setValueAtTime(0, startTime)
            gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02)
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
            osc.start(startTime); osc.stop(startTime + duration)
        }
        const t = ctx.currentTime
        playTone(880, t, 0.25)
        playTone(1100, t + 0.18, 0.3)
    } catch { }
}


function formatDateSeparator(dateStr: string): string {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return "Hoje"
    if (date.toDateString() === yesterday.toDateString()) return "Ontem"
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
}

function groupMessagesByDate(messages: CRMMessage[]) {
    const groups: { date: string; messages: CRMMessage[] }[] = []
    let currentDate = ""
    for (const msg of messages) {
        const msgDate = new Date(msg.created_at).toDateString()
        if (msgDate !== currentDate) {
            currentDate = msgDate
            groups.push({ date: msg.created_at, messages: [msg] })
        } else {
            groups[groups.length - 1].messages.push(msg)
        }
    }
    return groups
}

/** Detect URLs in text and render them as clickable links */
function renderMessageContent(content: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = content.split(urlRegex)
    return parts.map((part, i) => {
        if (urlRegex.test(part)) {
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 break-all hover:opacity-80"
                    onClick={e => e.stopPropagation()}
                >
                    {part}
                </a>
            )
        }
        return <span key={i}>{part}</span>
    })
}

/** Render media content based on content_type */
function renderMedia(msg: CRMMessage, isMe: boolean) {
    const { content, content_type } = msg
    const textColor = isMe ? "text-white/70" : "text-muted-foreground"

    if (content_type === "image") {
        return (
            <a href={content} target="_blank" rel="noopener noreferrer">
                <img
                    src={content}
                    alt="Imagem"
                    className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                />
            </a>
        )
    }
    if (content_type === "video") {
        return (
            <video controls className="max-w-full rounded-lg max-h-48">
                <source src={content} />
            </video>
        )
    }
    if (content_type === "audio") {
        return <audio controls src={content} className="max-w-full" />
    }
    // Default: text with clickable links
    return <p className="leading-relaxed break-words">{renderMessageContent(content)}</p>
}

// ─── Specialist (CRM) Chat Tab ────────────────────────────────────────────────

function SpecialistTab({
    userId,
    soundEnabled,
    isActive,
    onUnread,
    onAutoOpen,
}: {
    userId: string
    soundEnabled: boolean
    isActive: boolean
    onUnread: (n: number) => void
    onAutoOpen: () => void
}) {
    const [messages, setMessages] = useState<CRMMessage[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [conversationId, setConversationId] = useState<string | null>(null)
    const [sending, setSending] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [adminTyping, setAdminTyping] = useState(false)
    const [realtimeOk, setRealtimeOk] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const typingChannelRef = useRef<any>(null)
    const lastOpenedRef = useRef<Date>(new Date())
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    // Refs so closures always read current values (avoids stale closure bugs)
    const isActiveRef = useRef(isActive)
    const soundEnabledRef = useRef(soundEnabled)
    const onUnreadRef = useRef(onUnread)
    const onAutoOpenRef = useRef(onAutoOpen)
    const messagesRef = useRef<CRMMessage[]>([])
    useEffect(() => { isActiveRef.current = isActive }, [isActive])
    useEffect(() => { soundEnabledRef.current = soundEnabled }, [soundEnabled])
    useEffect(() => { onUnreadRef.current = onUnread }, [onUnread])
    useEffect(() => { onAutoOpenRef.current = onAutoOpen }, [onAutoOpen])

    const mergeMessages = useCallback((prev: CRMMessage[], incoming: CRMMessage[]) => {
        const existingIds = new Set(prev.map(m => m.id))
        const newMsgs = incoming.filter(m => !existingIds.has(m.id))
        return { merged: [...prev, ...newMsgs], newOutbound: newMsgs.filter(m => m.direction === "outbound") }
    }, [])

    const fetchChat = useCallback(async () => {
        try {
            const res = await fetch(`/api/crm/chat?user_id=${userId}`)
            if (!res.ok) return null
            return res.json()
        } catch {
            return null
        }
    }, [userId])

    // Keep messagesRef in sync
    useEffect(() => { messagesRef.current = messages }, [messages])

    // Init — deferred 3s so it doesn't compete with critical page resources on load
    useEffect(() => {
        const init = async () => {
            fetch("/api/crm/presence", { method: "POST" }).catch(() => { })
            const data = await fetchChat()
            if (!data) return
            setConversationId(data.conversation_id)
            setMessages(data.messages || [])
        }
        const timer = setTimeout(init, 3000)
        return () => clearTimeout(timer)
    }, [])

    // Realtime messages — stable subscription (no isActive/soundEnabled deps)
    useEffect(() => {
        if (!conversationId) return
        const channel = supabase
            .channel(`lead_chat_msgs:${conversationId}`)
            .on("postgres_changes", {
                event: "INSERT", schema: "public", table: "crm_messages",
                filter: `conversation_id=eq.${conversationId}`,
            }, (payload) => {
                const msg = payload.new as CRMMessage
                // Deduplicate
                if (messagesRef.current.find(m => m.id === msg.id)) return
                setMessages(prev => {
                    if (prev.find(m => m.id === msg.id)) return prev
                    return [...prev, msg]
                })
                // Sound + badge + auto-open — read from refs (always current)
                if (msg.direction === "outbound") {
                    if (soundEnabledRef.current) playNotificationSound()
                    if (!isActiveRef.current) {
                        onUnreadRef.current(1)
                        onAutoOpenRef.current()
                    }
                }
            })
            .subscribe(s => setRealtimeOk(s === "SUBSCRIBED"))
        return () => { supabase.removeChannel(channel) }
    }, [conversationId]) // stable — only recreate when conversationId changes

    // Polling fallback every 8s — dequeues any new messages missed by Realtime
    useEffect(() => {
        if (!conversationId) return
        const poll = async () => {
            const data = await fetchChat()
            if (!data?.messages) return
            const prev = messagesRef.current
            const existingIds = new Set(prev.map((m: CRMMessage) => m.id))
            const newMsgs = (data.messages as CRMMessage[]).filter(m => !existingIds.has(m.id))
            if (newMsgs.length === 0) return

            // Always add new messages to the view
            setMessages(prev => [...prev, ...newMsgs])

            // Only fire notification for outbound messages received AFTER the chat was last opened
            const newOutbound = newMsgs.filter(m => m.direction === "outbound")
            const notifiable = newOutbound.filter(m => new Date(m.created_at) > lastOpenedRef.current)
            if (notifiable.length > 0) {
                if (soundEnabledRef.current) playNotificationSound()
                if (!isActiveRef.current) {
                    onUnreadRef.current(notifiable.length)
                    onAutoOpenRef.current()
                }
            }
        }
        const interval = setInterval(poll, 8000)
        return () => clearInterval(interval)
    }, [conversationId])

    // Typing indicator
    useEffect(() => {
        if (!conversationId) return
        const channel = supabase.channel(`lead_chat_typing:${conversationId}`)
        channel.on("broadcast", { event: "typing" }, (payload) => {
            if (payload.payload?.role === "admin") {
                setAdminTyping(true)
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
                typingTimeoutRef.current = setTimeout(() => setAdminTyping(false), 3000)
            }
        }).subscribe()
        typingChannelRef.current = channel
        return () => {
            supabase.removeChannel(channel)
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        }
    }, [conversationId])

    const handleTyping = useCallback(() => {
        typingChannelRef.current?.send({ type: "broadcast", event: "typing", payload: { role: "lead" } })
    }, [])

    // Presence heartbeat
    useEffect(() => {
        const interval = setInterval(() => fetch("/api/crm/presence", { method: "POST" }).catch(() => { }), 60_000)
        return () => clearInterval(interval)
    }, [])

    // Auto-scroll
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, adminTyping, isActive])

    // When tab becomes active, reset unread timestamp
    useEffect(() => {
        if (isActive) {
            lastOpenedRef.current = new Date()
        }
    }, [isActive])

    const handleSend = async () => {
        if (!newMessage.trim() || !conversationId || sending) return
        const content = newMessage.trim()
        setNewMessage("")
        setSending(true)
        const tempId = `temp-${Date.now()}`
        const tempMsg: CRMMessage = { id: tempId, content, direction: "inbound", created_at: new Date().toISOString() }
        setMessages(prev => [...prev, tempMsg])
        try {
            const res = await fetch("/api/crm/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, conversation_id: conversationId, content, content_type: "text" }),
            })
            const data = await res.json()
            if (data.message) setMessages(prev => prev.map(m => m.id === tempId ? data.message : m))
        } catch {
            setMessages(prev => prev.filter(m => m.id !== tempId))
            setNewMessage(content)
        } finally { setSending(false) }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !conversationId) return
        setUploading(true)

        try {
            const supabaseClient = createClient()
            const ext = file.name.split(".").pop()
            const path = `crm-chat/${conversationId}/${Date.now()}.${ext}`

            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from("chat-media")
                .upload(path, file, { upsert: true })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabaseClient.storage.from("chat-media").getPublicUrl(path)

            // Determine content type
            let content_type = "file"
            if (file.type.startsWith("image/")) content_type = "image"
            else if (file.type.startsWith("video/")) content_type = "video"
            else if (file.type.startsWith("audio/")) content_type = "audio"

            const res = await fetch("/api/crm/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, conversation_id: conversationId, content: publicUrl, content_type }),
            })
            const data = await res.json()
            if (data.message) setMessages(prev => [...prev, data.message])
        } catch (err) {
            console.error("[FloatingCRMChat] Upload error:", err)
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    const messageGroups = groupMessagesByDate(messages)

    return (
        <div className="flex flex-col h-full">
            {/* Realtime status bar */}
            <div className={cn("px-3 py-1 text-[10px] flex items-center gap-1.5 shrink-0", realtimeOk ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400")}>
                <span className={cn("w-1.5 h-1.5 rounded-full", realtimeOk ? "bg-green-400 animate-pulse" : "bg-yellow-400")} />
                {realtimeOk ? "Conectado em tempo real" : "Conectando..."}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-muted/10">
                {messages.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-8">
                        👋 Olá! Fale com nosso especialista em Aviator.
                    </div>
                )}
                {messageGroups.map((group, gi) => (
                    <div key={gi}>
                        <div className="flex items-center gap-2 my-3">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-[10px] text-muted-foreground font-medium px-2 py-0.5 bg-muted rounded-full">
                                {formatDateSeparator(group.date)}
                            </span>
                            <div className="flex-1 h-px bg-border" />
                        </div>
                        <div className="space-y-2">
                            {group.messages.map(msg => {
                                const isMe = msg.direction === "inbound"
                                const isTemp = msg.id.startsWith("temp-")
                                return (
                                    <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                                        <div className={cn(
                                            "max-w-[82%] rounded-2xl px-3 py-2 text-sm transition-opacity",
                                            isTemp && "opacity-60",
                                            isMe
                                                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-sm"
                                                : "bg-white dark:bg-slate-800 text-foreground rounded-bl-sm shadow-sm border border-border/40"
                                        )}>
                                            {renderMedia(msg, isMe)}
                                            <p className={cn("text-[10px] mt-0.5 text-right", isMe ? "text-white/70" : "text-muted-foreground")}>
                                                {isTemp ? "Enviando..." : new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
                {adminTyping && (
                    <div className="flex justify-start mt-2">
                        <div className="bg-white dark:bg-slate-800 border border-border/40 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                            <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t bg-card shrink-0">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*"
                    className="hidden"
                    onChange={handleFileUpload}
                />
                <div className="flex gap-1.5 items-center">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || !conversationId}
                        className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center shrink-0 transition-colors disabled:opacity-40"
                        title="Enviar mídia"
                    >
                        {uploading
                            ? <span className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            : <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                        }
                    </button>
                    <Input
                        value={newMessage}
                        onChange={e => { setNewMessage(e.target.value); handleTyping() }}
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 h-9 text-sm"
                        disabled={sending || !conversationId}
                    />
                    <Button
                        size="icon"
                        className="h-9 w-9 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 shrink-0"
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending || !conversationId}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ─── Global Chat Tab ───────────────────────────────────────────────────────────

function GlobalTab() {
    return (
        <div className="flex-1 overflow-hidden h-full">
            <ChatWindow />
        </div>
    )
}

// ─── Unified Floating Chat ─────────────────────────────────────────────────────

/**
 * UnifiedFloatingChat — Single button, two tabs:
 *   1. Especialista em Aviator (CRM chat — priority tab)
 *   2. Chat Global (community chat)
 *
 * Exported as FloatingCRMChat so layout.tsx doesn't need changes.
 * FloatingChat in (protected)/layout.tsx should be removed.
 */
export function FloatingCRMChat() {
    const [isOpen, setIsOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<Tab>("specialist")
    const [userId, setUserId] = useState<string | null>(null)
    const [ready, setReady] = useState(false)
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [specialistUnread, setSpecialistUnread] = useState(0)
    const [globalUnread] = useState(0)

    useEffect(() => {
        // Defer auth check by 1s so it doesn't block page first paint
        const timer = setTimeout(async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            setUserId(user?.id ?? null)
            setReady(true)
        }, 1000)
        return () => clearTimeout(timer)
    }, [])

    const handleOpen = () => {
        setIsOpen(true)
        if (activeTab === "specialist") setSpecialistUnread(0)
    }

    const totalUnread = specialistUnread + globalUnread

    // Don't render for non-logged-in users
    if (!ready || !userId) return null

    return (
        <>
            {/* Floating Button — hidden when chat is open */}
            <div className={cn("fixed bottom-6 right-6 z-50", isOpen && "hidden")}>
                <button
                    onClick={handleOpen}
                    className="w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center relative"
                    aria-label="Abrir chat"
                >
                    <MessageCircle className="w-6 h-6 text-white" />
                    {totalUnread > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white animate-bounce">
                            {totalUnread > 9 ? "9+" : totalUnread}
                        </span>
                    )}
                    <span className="absolute inset-0 rounded-full bg-purple-600 opacity-40 animate-ping" />
                </button>
            </div>

            {/*
              * Chat Panel is ALWAYS in the DOM (CSS hidden/flex, not conditional render).
              * This keeps SpecialistTab always mounted → Realtime stays connected 24/7.
              * No more "Conectando..." every time the chat opens.
              */}
            <div className={cn(
                "fixed bottom-6 right-6 z-50 w-[370px] h-[560px] bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-2xl flex-col overflow-hidden",
                isOpen ? "flex" : "hidden"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                            <MessageCircle className="w-4 h-4" />
                        </div>
                        <p className="font-semibold text-sm">
                            {activeTab === "specialist" ? "Especialista em Aviator" : "Chat da Comunidade"}
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setSoundEnabled(s => !s)}
                            className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                            title={soundEnabled ? "Desativar som" : "Ativar som"}
                        >
                            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border shrink-0 bg-card">
                    <button
                        onClick={() => { setActiveTab("specialist"); setSpecialistUnread(0) }}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all relative",
                            activeTab === "specialist"
                                ? "text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Especialista
                        {specialistUnread > 0 && (
                            <span className="absolute top-1.5 right-3 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {specialistUnread > 9 ? "9+" : specialistUnread}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("global")}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all relative",
                            activeTab === "global"
                                ? "text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Users className="w-3.5 h-3.5" />
                        Chat Global
                        {globalUnread > 0 && (
                            <span className="absolute top-1.5 right-3 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {globalUnread}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {/*
                      * SpecialistTab is always rendered (panel is always in DOM).
                      * Use CSS hidden/flex to show/hide — never unmount.
                      */}
                    <div className={cn("flex-1 overflow-hidden flex flex-col", activeTab !== "specialist" && "hidden")}>
                        <SpecialistTab
                            userId={userId}
                            soundEnabled={soundEnabled}
                            isActive={isOpen && activeTab === "specialist"}
                            onUnread={n => setSpecialistUnread(c => c + n)}
                            onAutoOpen={() => {
                                setIsOpen(true)
                                setActiveTab("specialist")
                                setSpecialistUnread(0)
                            }}
                        />
                    </div>
                    {activeTab === "global" && <GlobalTab />}
                </div>
            </div>
        </>
    )
}
