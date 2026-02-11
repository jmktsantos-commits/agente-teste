"use client"

import { useEffect, useState, useRef } from "react"
import { Send, Shield, Bot, User } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area" // Need ScrollArea, I'll use div with overflow-y-auto for now to save time
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar" // Need Avatar
import { enviarMensagemChat } from "@/lib/webhooks"
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
    role: "user" | "admin" | "system"
    username?: string
}

export function ChatWindow() {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    useEffect(() => {
        // Initial fetch
        const fetchMessages = async () => {
            const { data } = await supabase
                .from("chat_messages")
                .select("*")
                .order("created_at", { ascending: false }) // Fetch last 50
                .limit(50)

            if (data) {
                setMessages(data.reverse() as any) // Type assertion for now
            } else {
                // Fallback mock data if table doesn't exist yet
                setMessages([
                    { id: "1", user_id: "system", content: "Bem-vindo ao chat da comunidade!", created_at: new Date().toISOString(), role: "system", username: "Sistema" },
                    { id: "2", user_id: "u1", content: "Alguém pegou a rosa de 15x?", created_at: new Date(Date.now() - 60000).toISOString(), role: "user", username: "Lucas" },
                    { id: "3", user_id: "admin", content: "Atenção: possível sequência de alta.", created_at: new Date().toISOString(), role: "admin", username: "Admin" },
                ])
            }
        }

        fetchMessages()

        // Realtime subscription
        const channel = supabase
            .channel("chat")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "chat_messages", filter: "visible=eq.true" },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new as any])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
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
                console.error("User not authenticated")
                return
            }

            // Call Webhook for moderation
            // The webhook will decide whether to insert into Supabase or not
            await enviarMensagemChat(user.id, content)

            // We don't manually add the message here anymore.
            // We rely on Supabase Realtime to show the message once it's inserted by n8n.
            // This ensures only moderated/approved messages appear.

        } catch (error) {
            console.error("Erro ao enviar mensagem", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-[600px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    Chat da Comunidade
                    <Badge variant="outline" className="text-green-500 border-green-500">Online: 142</Badge>
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === "user" && msg.username === "Você" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "admin" ? "bg-red-500" : msg.role === "system" ? "bg-blue-500" : "bg-slate-700"
                            }`}>
                            {msg.role === "admin" ? <Shield className="w-4 h-4 text-white" /> :
                                msg.role === "system" ? <Bot className="w-4 h-4 text-white" /> :
                                    <User className="w-4 h-4 text-slate-300" />}
                        </div>

                        <div className={`flex flex-col max-w-[80%] ${msg.role === "user" && msg.username === "Você" ? "items-end" : "items-start"}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-bold ${msg.role === "admin" ? "text-red-400" :
                                    msg.role === "system" ? "text-blue-400" : "text-slate-400"
                                    }`}>
                                    {msg.username || "Usuário"}
                                </span>
                                <span className="text-[10px] text-slate-600">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className={`p-3 rounded-lg text-sm ${msg.role === "admin" ? "bg-red-500/10 text-red-200 border border-red-500/20" :
                                msg.role === "system" ? "bg-blue-500/10 text-blue-200 border border-blue-500/20" :
                                    msg.username === "Você" ? "bg-primary text-white" : "bg-slate-800 text-slate-200"
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="bg-slate-900 border-slate-700 text-white focus-visible:ring-primary"
                    disabled={loading}
                />
                <Button type="submit" size="icon" disabled={loading || !newMessage.trim()} className="shrink-0 bg-primary hover:bg-primary/90">
                    <Send className="w-4 h-4" />
                </Button>
            </form>
        </div>
    )
}
