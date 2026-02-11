"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { perguntarSuporte } from "@/lib/webhooks"
import { createClient } from "@/utils/supabase/client"

interface Message {
    role: "user" | "assistant"
    content: string
}

export function SupportChat() {
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Olá! Sou a IA de suporte do Aviator. Como posso ajudar você hoje com estratégias ou dúvidas sobre a plataforma?" }
    ])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || loading) return

        const question = input
        setInput("")
        setLoading(true)

        // Add user message immediately
        const newHistory = [...messages, { role: "user", content: question } as Message]
        setMessages(newHistory)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Call real webhook
            const response = await perguntarSuporte(user.id, question, newHistory)

            if (response && response.answer) {
                setMessages(prev => [...prev, { role: "assistant", content: response.answer }])
            } else {
                throw new Error("Resposta inválida da IA")
            }

        } catch (error) {
            console.error("Erro no suporte IA", error)
            setMessages(prev => [...prev, { role: "assistant", content: "Ops! Tive um problema para conectar com minha inteligência. Tente novamente em alguns instantes." }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="h-[600px] flex flex-col bg-slate-900 border-slate-800 text-white">
            <CardHeader className="border-b border-slate-800 bg-slate-950">
                <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    Suporte Inteligente (IA)
                </CardTitle>
                <CardDescription>
                    Tire dúvidas sobre funcionalidades ou estratégias 24/7.
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "bg-primary" : "bg-slate-700"
                            }`}>
                            {msg.role === "assistant" ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-slate-300" />}
                        </div>

                        <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === "assistant" ? "bg-slate-800 text-slate-200" : "bg-primary/20 text-white border border-primary/20"
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-slate-800 p-3 rounded-lg flex items-center">
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        </div>
                    </div>
                )}
            </CardContent>

            <div className="p-4 border-t border-slate-800 bg-slate-950">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Pergunte sobre estratégias, plataforma..."
                        className="bg-slate-900 border-slate-700 text-white focus-visible:ring-primary"
                        disabled={loading}
                    />
                    <Button type="submit" size="icon" disabled={loading || !input.trim()} className="shrink-0 bg-primary hover:bg-primary/90">
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </div>
        </Card>
    )
}
