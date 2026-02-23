"use client"

import { useEffect, useState, useRef } from "react"
import { Send, Shield, Bot, User } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

// I'll need Avatar component. 
// I'll create `src/components/ui/avatar.tsx` first.
// And `src/components/ui/scroll-area.tsx` if I use it.
// I'll stick to div for scroll area.

interface Message {
    id: string
    user_id: string
    content: string
    created_at: string
    role: "user" | "admin" | "system" | "bot"
    username?: string
    is_bot?: boolean
}

export function ChatWindow() {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const [usersOnline, setUsersOnline] = useState(0)
    const scrollRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    // Fluctuating online count between 103 and 498
    useEffect(() => {
        const random = () => Math.floor(Math.random() * (498 - 103 + 1)) + 103
        setUsersOnline(random())
        const interval = setInterval(() => setUsersOnline(random()), Math.floor(Math.random() * 5000) + 5000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        let pollInterval: NodeJS.Timeout | null = null
        let isRealtimeConnected = false

        // Initial fetch
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from("chat_messages")
                .select("*")
                .eq("visible", true)
                .order("created_at", { ascending: true })
                .limit(100) // Last 100 messages

            if (data && !error) {
                setMessages(data as any)
            } else if (error) {
                console.error("Erro ao carregar mensagens:", error)
            }
        }

        fetchMessages()

        // Realtime subscription with debug logs
        console.log("🔌 Setting up realtime subscription for chat...")

        const channel = supabase
            .channel("chat_global")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "chat_messages"
                },
                (payload) => {
                    console.log("📨 New message received via realtime:", payload)
                    const newMsg = payload.new as any
                    // Only add if visible
                    if (newMsg.visible) {
                        setMessages((prev) => {
                            // Check if message already exists to avoid duplicates
                            if (prev.find(m => m.id === newMsg.id)) {
                                return prev
                            }
                            return [...prev, newMsg]
                        })
                    }
                }
            )
            .subscribe((status) => {
                console.log("🔌 Realtime subscription status:", status)
                if (status === "SUBSCRIBED") {
                    console.log("✅ Successfully subscribed to chat realtime!")
                    isRealtimeConnected = true
                    // Clear polling if realtime connects
                    if (pollInterval) {
                        clearInterval(pollInterval)
                        pollInterval = null
                        console.log("🔌 Stopped polling - using realtime")
                    }
                } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
                    console.warn("⚠️ Realtime failed, falling back to polling...")
                    isRealtimeConnected = false

                    // Start polling as fallback if not already polling
                    if (!pollInterval) {
                        console.log("🔄 Starting polling every 3 seconds...")
                        pollInterval = setInterval(async () => {
                            const { data } = await supabase
                                .from("chat_messages")
                                .select("*")
                                .eq("visible", true)
                                .order("created_at", { ascending: true })
                                .limit(100)

                            if (data) {
                                setMessages(data as any)
                            }
                        }, 3000) // Poll every 3 seconds
                    }
                }
            })

        return () => {
            console.log("🔌 Cleaning up realtime subscription and polling...")
            supabase.removeChannel(channel)
            if (pollInterval) {
                clearInterval(pollInterval)
            }
        }
    }, [supabase])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        const content = newMessage
        setNewMessage("")
        setLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                console.error("Usuário não autenticado")
                setLoading(false)
                return
            }

            // Get user profile to get username/name
            const { data: profile } = await supabase
                .from("profiles")
                .select("username, full_name, first_name") // Select name fields
                .eq("id", user.id)
                .single()

            // Prioritize name: Full Name > First Name > Username > Email part > "Usuário"
            const senderName = profile?.full_name || profile?.first_name || profile?.username || user.email?.split("@")[0] || "Usuário"

            // Insert message directly to Supabase
            const { error } = await supabase
                .from("chat_messages")
                .insert({
                    user_id: user.id,
                    content: content,
                    role: "user",
                    is_bot: false,
                    username: senderName, // Use the resolved name
                    visible: true
                })

            if (error) {
                console.error("Erro ao enviar mensagem:", error)
                // Show error to user
                alert("Erro ao enviar mensagem. Tente novamente.")
            }

            // Message will appear via realtime subscription

        } catch (error) {
            console.error("Erro ao enviar mensagem:", error)
            alert("Erro ao enviar mensagem. Tente novamente.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-slate-900 overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-semibold text-white">Chat ao Vivo</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-green-400 font-medium">{usersOnline} pessoas ao vivo</span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === "user" && msg.username === "Você" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.is_bot || msg.role === "bot"
                            ? "bg-gradient-to-r from-purple-600 to-pink-600"
                            : msg.role === "admin"
                                ? "bg-red-500"
                                : msg.role === "system"
                                    ? "bg-blue-500"
                                    : "bg-slate-700"
                            }`}>
                            {msg.is_bot || msg.role === "bot" ? <Bot className="w-5 h-5 text-white" /> :
                                msg.role === "admin" ? <Shield className="w-4 h-4 text-white" /> :
                                    msg.role === "system" ? <Bot className="w-4 h-4 text-white" /> :
                                        <User className="w-4 h-4 text-slate-300" />}
                        </div>

                        <div className={`flex flex-col max-w-[80%] ${msg.role === "user" && msg.username === "Você" ? "items-end" : "items-start"}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-bold ${msg.is_bot || msg.role === "bot" ? "text-purple-400" :
                                    msg.role === "admin" ? "text-red-400" :
                                        msg.role === "system" ? "text-blue-400" : "text-slate-400"
                                    }`}>
                                    {msg.username || "Usuário"}
                                </span>
                                {(msg.is_bot || msg.role === "bot") && (
                                    <Badge variant="outline" className="text-[9px] h-4 px-1 border-purple-500/50 text-purple-400">
                                        BOT
                                    </Badge>
                                )}
                                <span className="text-[10px] text-slate-600">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className={`p-3 rounded-lg text-sm ${msg.is_bot || msg.role === "bot"
                                ? "bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-100 border border-purple-500/20" :
                                msg.role === "admin"
                                    ? "bg-red-500/10 text-red-200 border border-red-500/20" :
                                    msg.role === "system"
                                        ? "bg-blue-500/10 text-blue-200 border border-blue-500/20" :
                                        msg.username === "Você"
                                            ? "bg-primary text-white"
                                            : "bg-slate-800 text-slate-200"
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2 shrink-0">
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="bg-slate-900 border-slate-700 text-white focus-visible:ring-primary h-10"
                    disabled={loading}
                />
                <Button type="submit" size="icon" disabled={loading || !newMessage.trim()} className="shrink-0 h-10 w-10 bg-primary hover:bg-primary/90">
                    <Send className="w-4 h-4" />
                </Button>
            </form>
        </div>
    )
}
