"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { CRMService, DBLead, ConversationType } from "@/services/crm"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
    Loader2, Send, Globe, Phone, Mail, Users, CheckCircle2,
    AlertCircle, Tag, Wifi, WifiOff, Filter, Radio, MousePointerClick
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { PopupManager } from "@/components/admin/crm/popup-manager"

// ─── Types & constants ────────────────────────────────────────────────────────

const CHANNELS: { key: ConversationType | "whatsapp_official"; label: string; icon: React.ReactNode; color: string; badge?: string }[] = [
    {
        key: "site_chat",
        label: "Chat do Site",
        icon: <Globe className="w-4 h-4" />,
        color: "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300",
    },
    {
        key: "whatsapp",
        label: "WhatsApp (Web)",
        icon: <Phone className="w-4 h-4" />,
        color: "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300",
    },
    {
        key: "whatsapp_official",
        label: "WhatsApp Business API",
        icon: <Phone className="w-4 h-4" />,
        color: "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300",
        badge: "Oficial",
    },
    {
        key: "email",
        label: "Email",
        icon: <Mail className="w-4 h-4" />,
        color: "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
    },
]

const STATUS_LABELS: Record<string, string> = {
    new: "Novo",
    contacted: "Contactado",
    interested: "Interessado",
    converted: "Convertido",
    lost: "Perdido",
}

function isOnline(lead: DBLead) {
    if (!lead.last_seen_at) return false
    return Date.now() - new Date(lead.last_seen_at).getTime() < 5 * 60 * 1000 // 5 min
}

function getInitials(name: string) {
    return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
}

// ─── Lead Row ─────────────────────────────────────────────────────────────────
function LeadRow({ lead, checked, onToggle }: { lead: DBLead; checked: boolean; onToggle: () => void }) {
    const online = isOnline(lead)
    return (
        <label className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
            checked ? "bg-purple-50 dark:bg-purple-900/20" : "hover:bg-muted/60"
        )}>
            <Checkbox checked={checked} onCheckedChange={onToggle} />
            <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                    {getInitials(lead.full_name)}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{lead.full_name}</span>
                    {online
                        ? <Wifi className="w-3 h-3 text-green-500 shrink-0" />
                        : <WifiOff className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                    }
                </div>
                <p className="text-xs text-muted-foreground truncate">
                    {lead.email || lead.phone || "Sem contato"}
                </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                {(lead.tags ?? []).slice(0, 2).map(tag => (
                    <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                        {tag}
                    </span>
                ))}
            </div>
        </label>
    )
}

// ─── Result summary ───────────────────────────────────────────────────────────
interface BroadcastResult {
    sent: number
    failed: number
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CRMBroadcastPage() {
    const [leads, setLeads] = useState<DBLead[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [filterOnline, setFilterOnline] = useState<"all" | "online" | "offline">("all")
    const [filterTags, setFilterTags] = useState<string[]>([])
    const [filterStatus, setFilterStatus] = useState<string>("all")
    const [tagInput, setTagInput] = useState("")
    const tagInputRef = useRef<HTMLInputElement>(null)

    // Target
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Broadcast
    const [channel, setChannel] = useState<ConversationType | "whatsapp_official">("site_chat")
    const [message, setMessage] = useState("")
    const [sending, setSending] = useState(false)
    const [result, setResult] = useState<BroadcastResult | null>(null)

    // Load all leads
    useEffect(() => {
        const load = async () => {
            try {
                const { leads } = await CRMService.getLeads({ limit: 500 })
                setLeads(leads)
            } catch {
                toast.error("Falha ao carregar leads")
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    // All unique tags
    const allTags = useMemo(() => {
        const set = new Set<string>()
        leads.forEach(l => (l.tags ?? []).forEach(t => set.add(t)))
        return Array.from(set).sort()
    }, [leads])

    // Filtered leads
    const filtered = useMemo(() => {
        return leads.filter(lead => {
            if (filterOnline === "online" && !isOnline(lead)) return false
            if (filterOnline === "offline" && isOnline(lead)) return false
            if (filterStatus !== "all" && lead.status !== filterStatus) return false
            if (filterTags.length > 0 && !filterTags.every(t => (lead.tags ?? []).includes(t))) return false
            return true
        })
    }, [leads, filterOnline, filterStatus, filterTags])

    // Sync selectedIds when filter changes (remove deselected)
    useEffect(() => {
        const filteredIds = new Set(filtered.map(l => l.id))
        setSelectedIds(prev => new Set([...prev].filter(id => filteredIds.has(id))))
    }, [filtered])

    const allSelected = filtered.length > 0 && filtered.every(l => selectedIds.has(l.id))
    const someSelected = filtered.some(l => selectedIds.has(l.id))

    const toggleAll = () => {
        if (allSelected) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filtered.map(l => l.id)))
        }
    }

    const toggleOne = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const toggleTag = (tag: string) => {
        setFilterTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        )
    }

    const addTagFromInput = () => {
        const tag = tagInput.trim().toLowerCase()
        if (!tag || filterTags.includes(tag)) { setTagInput(""); return }
        setFilterTags(prev => [...prev, tag])
        setTagInput("")
    }

    const removeTag = (tag: string) => setFilterTags(prev => prev.filter(t => t !== tag))

    const handleSend = async () => {
        if (!message.trim() || selectedIds.size === 0 || sending) return
        setSending(true)
        setResult(null)
        try {
            const res = await fetch("/api/crm/broadcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    leadIds: Array.from(selectedIds),
                    channel,
                    content: message.trim(),
                }),
            })
            const data = await res.json()
            setResult({ sent: data.sent, failed: data.failed })
            if (data.sent > 0) {
                toast.success(`Transmissão enviada para ${data.sent} lead(s)!`)
                setMessage("")
                setSelectedIds(new Set())
            }
            if (data.failed > 0) {
                toast.error(`${data.failed} envio(s) falharam.`)
            }
        } catch {
            toast.error("Erro ao enviar transmissão.")
        } finally {
            setSending(false)
        }
    }

    const canSend = message.trim().length > 0 && selectedIds.size > 0 && !sending

    return (
        <div className="flex flex-col gap-6 pb-8">
            {/* Sub-tabs */}
            <Tabs defaultValue="mass" className="w-full">
                <TabsList className="mb-4 w-full flex-wrap h-auto justify-start p-1 bg-muted/50 gap-1 rounded-lg">
                    <TabsTrigger value="mass" className="gap-1.5 flex-1 min-w-[140px] text-xs sm:text-sm py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Radio className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Transmissão em Massa</span>
                    </TabsTrigger>
                    <TabsTrigger value="popups" className="gap-1.5 flex-1 min-w-[140px] text-xs sm:text-sm py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <MousePointerClick className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Pop-ups do Site</span>
                    </TabsTrigger>
                </TabsList>

                {/* ── TAB 1: Mass Broadcast ── */}
                <TabsContent value="mass">

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* LEFT: Lead Selector */}
                        <div className="border rounded-xl overflow-hidden flex flex-col">
                            <div className="px-4 py-3 bg-muted/40 border-b">
                                <div className="flex items-center gap-2 mb-3">
                                    <Filter className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-semibold">Filtros</span>
                                </div>

                                {/* Online filter */}
                                <div className="flex gap-1.5 mb-3">
                                    {(["all", "online", "offline"] as const).map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setFilterOnline(opt)}
                                            className={cn(
                                                "flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-all",
                                                filterOnline === opt
                                                    ? "bg-purple-600 text-white border-purple-600"
                                                    : "bg-background text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {opt === "online" && <Wifi className="w-3 h-3" />}
                                            {opt === "offline" && <WifiOff className="w-3 h-3" />}
                                            {opt === "all" ? "Todos" : opt === "online" ? "Online" : "Offline"}
                                        </button>
                                    ))}
                                </div>

                                {/* Status filter */}
                                <div className="flex gap-1.5 flex-wrap mb-3">
                                    {["all", "new", "contacted", "interested", "converted", "lost"].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setFilterStatus(s)}
                                            className={cn(
                                                "text-xs px-2.5 py-1 rounded-full border font-medium transition-all",
                                                filterStatus === s
                                                    ? "bg-purple-600 text-white border-purple-600"
                                                    : "bg-background text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {s === "all" ? "Todos status" : STATUS_LABELS[s]}
                                        </button>
                                    ))}
                                </div>

                                {/* Tags filter — always visible */}
                                <div className="space-y-2">
                                    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                        <Tag className="w-3 h-3" /> Filtrar por Tags
                                    </span>

                                    {/* Text input to type a tag */}
                                    <div className="flex gap-1.5">
                                        <Input
                                            ref={tagInputRef}
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTagFromInput() } }}
                                            placeholder="Digite uma tag e pressione Enter..."
                                            className="h-7 text-xs flex-1"
                                        />
                                        <button
                                            onClick={addTagFromInput}
                                            disabled={!tagInput.trim()}
                                            className="text-xs px-2.5 py-1 rounded-md border font-medium bg-background hover:bg-muted disabled:opacity-40 transition-all shrink-0"
                                        >
                                            +
                                        </button>
                                    </div>

                                    {/* Active tag filters */}
                                    {filterTags.length > 0 && (
                                        <div className="flex gap-1 flex-wrap">
                                            {filterTags.map(tag => (
                                                <button
                                                    key={tag}
                                                    onClick={() => removeTag(tag)}
                                                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-pink-600 text-white font-medium hover:bg-pink-700 transition-all"
                                                >
                                                    #{tag} ×
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setFilterTags([])}
                                                className="text-xs text-muted-foreground hover:text-foreground px-1"
                                            >
                                                Limpar
                                            </button>
                                        </div>
                                    )}

                                    {/* Existing tags from leads as quick-select */}
                                    {allTags.length > 0 && (
                                        <div className="flex gap-1 flex-wrap pt-0.5">
                                            {allTags.filter(t => !filterTags.includes(t)).map(tag => (
                                                <button
                                                    key={tag}
                                                    onClick={() => toggleTag(tag)}
                                                    className="text-xs px-2 py-0.5 rounded-full border font-medium bg-background text-muted-foreground hover:text-foreground hover:border-pink-400 transition-all"
                                                >
                                                    #{tag}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Select all header */}
                            <div className="flex items-center gap-3 px-3 py-2 border-b bg-background">
                                <Checkbox
                                    checked={allSelected}
                                    ref={(el) => {
                                        if (el) (el as HTMLButtonElement).dataset.indeterminate = String(someSelected && !allSelected)
                                    }}
                                    onCheckedChange={toggleAll}
                                />
                                <span className="text-xs font-medium text-muted-foreground flex-1">
                                    {filtered.length} lead(s) encontrado(s)
                                </span>
                                {selectedIds.size > 0 && (
                                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                                        {selectedIds.size} selecionado(s)
                                    </span>
                                )}
                            </div>

                            {/* Lead list */}
                            <ScrollArea className="flex-1 h-[340px]">
                                {loading ? (
                                    <div className="flex h-40 items-center justify-center">
                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 gap-2">
                                        <Users className="w-8 h-8 text-muted-foreground/40" />
                                        <p className="text-sm text-muted-foreground">Nenhum lead com esses filtros.</p>
                                    </div>
                                ) : (
                                    <div className="p-2 space-y-0.5">
                                        {filtered.map(lead => (
                                            <LeadRow
                                                key={lead.id}
                                                lead={lead}
                                                checked={selectedIds.has(lead.id)}
                                                onToggle={() => toggleOne(lead.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>

                        {/* RIGHT: Compose & Settings */}
                        <div className="flex flex-col gap-4">
                            {/* Channel picker */}
                            <div className="border rounded-xl p-4">
                                <p className="text-sm font-semibold mb-3">Canal de envio</p>
                                <div className="flex flex-col gap-2">
                                    {CHANNELS.map(ch => (
                                        <button
                                            key={ch.key}
                                            onClick={() => setChannel(ch.key)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all text-left",
                                                channel === ch.key
                                                    ? ch.color + " border-current"
                                                    : "border-border hover:bg-muted/60 text-muted-foreground"
                                            )}
                                        >
                                            {ch.icon}
                                            {ch.label}
                                            {ch.badge && (
                                                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30">
                                                    {ch.badge}
                                                </span>
                                            )}
                                            {channel === ch.key && (
                                                <CheckCircle2 className="w-4 h-4 ml-auto" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message composer */}
                            <div className="border rounded-xl p-4 flex flex-col gap-3">
                                <p className="text-sm font-semibold">Mensagem</p>
                                <Textarea
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder="Digite a mensagem que será enviada para os leads selecionados..."
                                    className="min-h-[140px] resize-none text-sm"
                                />
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{message.length} caracteres</span>
                                    <span>
                                        {selectedIds.size === 0
                                            ? "Nenhum lead selecionado"
                                            : `Será enviado para ${selectedIds.size} lead(s)`}
                                    </span>
                                </div>
                            </div>

                            {/* Result */}
                            {result && (
                                <div className={cn(
                                    "rounded-xl border px-4 py-3 flex items-center gap-3 text-sm",
                                    result.failed === 0
                                        ? "border-green-300 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                                        : "border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                                )}>
                                    {result.failed === 0
                                        ? <CheckCircle2 className="w-5 h-5 shrink-0" />
                                        : <AlertCircle className="w-5 h-5 shrink-0" />
                                    }
                                    <span>
                                        <strong>{result.sent}</strong> enviado(s)
                                        {result.failed > 0 && <> · <strong>{result.failed}</strong> falhou(aram)</>}
                                    </span>
                                </div>
                            )}

                            {/* Send button */}
                            <Button
                                onClick={handleSend}
                                disabled={!canSend}
                                className="w-full h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 font-semibold gap-2"
                            >
                                {sending
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                                    : <><Send className="w-4 h-4" /> Enviar Transmissão ({selectedIds.size})</>
                                }
                            </Button>

                            <p className="text-xs text-muted-foreground text-center px-4">
                                Ao enviar, a mensagem será registrada no histórico de conversa de cada lead selecionado no canal escolhido.
                            </p>
                        </div>
                    </div>
                </TabsContent>

                {/* ── TAB 2: Site Popups ── */}
                <TabsContent value="popups">
                    <PopupManager />
                </TabsContent>
            </Tabs>
        </div>
    )
}
