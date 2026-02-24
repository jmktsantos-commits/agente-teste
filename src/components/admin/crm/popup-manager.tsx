"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
    Loader2, Send, Type, ImageIcon, Link as LinkIcon,
    Radio, Clock, Trash2, Calendar, PanelTop,
    Maximize2, ArrowDownRight, Eye, Upload, X, BarChart2,
    MousePointerClick, TrendingUp
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createClient } from "@/utils/supabase/client"

// ── Types ─────────────────────────────────────────────────────────────────────
type PopupType = "text" | "image"
type PopupPosition = "bottom-right" | "top" | "center"
type PopupStatus = "active" | "dismissed" | "scheduled" | "expired"

interface SitePopup {
    id: string
    type: PopupType
    content: string | null
    image_url: string | null
    link_url: string | null
    title: string | null
    position: PopupPosition
    target: "all" | "specific"
    status: PopupStatus
    created_at: string
    scheduled_at: string | null
    expires_at: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────
const POSITION_OPTIONS: { value: PopupPosition; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: "bottom-right", label: "Canto", desc: "Inferior direito", icon: <ArrowDownRight className="w-4 h-4" /> },
    { value: "top", label: "Topo", desc: "Banner no topo", icon: <PanelTop className="w-4 h-4" /> },
    { value: "center", label: "Centro", desc: "Modal central", icon: <Maximize2 className="w-4 h-4" /> },
]

const STATUS_MAP: Record<PopupStatus, React.ReactNode> = {
    active: <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300">● Ativo</Badge>,
    scheduled: <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300">🕐 Agendado</Badge>,
    dismissed: <Badge variant="outline" className="text-[10px] text-muted-foreground">Desativado</Badge>,
    expired: <Badge variant="outline" className="text-[10px] text-muted-foreground">Expirado</Badge>,
}

const POSITION_LABEL: Record<PopupPosition, string> = {
    "bottom-right": "Canto",
    top: "Topo",
    center: "Centro",
}

// ── Component ─────────────────────────────────────────────────────────────────
export function PopupManager() {
    const supabase = createClient()

    // Form state
    const [type, setType] = useState<PopupType>("text")
    const [position, setPosition] = useState<PopupPosition>("bottom-right")
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [imageUrl, setImageUrl] = useState("")
    const [linkUrl, setLinkUrl] = useState("")
    const [scheduledAt, setScheduledAt] = useState("")
    const [sending, setSending] = useState(false)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImageUpload = async (file: File) => {
        if (!file.type.startsWith("image/")) { toast.error("Selecione um arquivo de imagem."); return }
        if (file.size > 10 * 1024 * 1024) { toast.error("Imagem muito grande. Máximo 10MB."); return }
        setUploading(true)
        try {
            const ext = file.name.split(".").pop()
            const path = `popups/${Date.now()}.${ext}`
            const { error } = await supabase.storage.from("chat-media").upload(path, file, { upsert: true })
            if (error) throw error
            const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(path)
            setImageUrl(urlData.publicUrl)
            toast.success("Imagem enviada!")
        } catch (err: any) {
            toast.error(err.message || "Erro ao fazer upload da imagem.")
        } finally {
            setUploading(false)
        }
    }

    // History
    const [popups, setPopups] = useState<SitePopup[]>([])
    const [loadingHistory, setLoadingHistory] = useState(true)
    const pollRef = useRef<NodeJS.Timeout | null>(null)

    const loadHistory = async () => {
        try {
            const res = await fetch("/api/crm/popup")
            const data = await res.json()
            setPopups(Array.isArray(data) ? data : [])
        } catch {
            // ignore
        } finally {
            setLoadingHistory(false)
        }
    }

    useEffect(() => {
        loadHistory()
        // Poll every 30s to auto-refresh scheduled popups
        pollRef.current = setInterval(loadHistory, 30_000)
        return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }, [])

    // Analytics
    type PopupStat = SitePopup & { views: number; clicks: number; ctr: number }
    const [activeTab, setActiveTab] = useState<"compose" | "metrics">("compose")
    const [stats, setStats] = useState<PopupStat[]>([])
    const [loadingStats, setLoadingStats] = useState(false)

    const loadAnalytics = async () => {
        setLoadingStats(true)
        try {
            const res = await fetch("/api/crm/popup/events")
            const data = await res.json()
            setStats(Array.isArray(data) ? data : [])
        } catch { /* ignore */ }
        finally { setLoadingStats(false) }
    }

    const totalViews = stats.reduce((s, p) => s + p.views, 0)
    const totalClicks = stats.reduce((s, p) => s + p.clicks, 0)
    const totalCTR = totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0
    const maxViews = Math.max(...stats.map(p => p.views), 1)

    const handleSend = async () => {
        if (type === "text" && !content.trim()) { toast.error("Digite uma mensagem."); return }
        if (type === "image" && !imageUrl.trim()) { toast.error("Faça o upload de uma imagem."); return }
        setSending(true)
        try {
            const res = await fetch("/api/crm/popup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type,
                    title: title.trim() || null,
                    content: type === "text" ? content.trim() : null,
                    image_url: type === "image" ? imageUrl.trim() : null,
                    link_url: linkUrl.trim() || null,
                    position,
                    target: "all",
                    scheduled_at: scheduledAt || null,
                }),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            const isScheduled = scheduledAt && new Date(scheduledAt) > new Date()
            toast.success(isScheduled ? "Pop-up agendado com sucesso!" : "Pop-up enviado para todos os visitantes!")
            // Reset form
            setTitle(""); setContent(""); setImageUrl(""); setLinkUrl(""); setScheduledAt("")
            if (fileInputRef.current) fileInputRef.current.value = ""
            loadHistory()
        } catch (err: any) {
            toast.error(err.message || "Erro ao enviar pop-up.")
        } finally {
            setSending(false)
        }
    }

    const toggleStatus = async (id: string, currentStatus: PopupStatus) => {
        const newStatus = currentStatus === "active" ? "dismissed" : "active"
        try {
            const res = await fetch("/api/crm/popup", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: newStatus }),
            })
            if (!res.ok) throw new Error()
            setPopups(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))
            toast.success(newStatus === "active" ? "Pop-up ativado!" : "Pop-up desativado.")
        } catch {
            toast.error("Erro ao atualizar status.")
        }
    }

    const deletePopup = async (id: string) => {
        try {
            const res = await fetch("/api/crm/popup", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: "expired" }),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || "Falha ao remover.")
            }
            setPopups(prev => prev.filter(p => p.id !== id))
            toast.success("Pop-up removido.")
        } catch (err: any) {
            toast.error(err.message || "Erro ao remover pop-up.")
        }
    }

    const isScheduledFuture = scheduledAt && new Date(scheduledAt) > new Date()
    const canSend = type === "text" ? content.trim().length > 0 : imageUrl.trim().length > 0

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow">
                        <Radio className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold leading-tight">Pop-ups do Site</h3>
                        <p className="text-sm text-muted-foreground">Envie notificações em tempo real para os visitantes.</p>
                    </div>
                </div>
                {/* Tab switcher */}
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    <button onClick={() => setActiveTab("compose")}
                        className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                            activeTab === "compose" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
                        Criar
                    </button>
                    <button onClick={() => { setActiveTab("metrics"); loadAnalytics() }}
                        className={cn("flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                            activeTab === "metrics" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
                        <BarChart2 className="w-3 h-3" /> Métricas
                    </button>
                </div>
            </div>

            {/* ── METRICS TAB ─────────────────────────────────────────── */}
            {activeTab === "metrics" && (
                <div className="flex flex-col gap-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: "Visualizações", value: totalViews, icon: <Eye className="w-4 h-4" />, color: "text-indigo-500" },
                            { label: "Cliques", value: totalClicks, icon: <MousePointerClick className="w-4 h-4" />, color: "text-pink-500" },
                            { label: "CTR Médio", value: `${totalCTR}%`, icon: <TrendingUp className="w-4 h-4" />, color: "text-green-500" },
                        ].map(card => (
                            <div key={card.label} className="border rounded-xl p-4 flex flex-col gap-2">
                                <div className={cn("flex items-center gap-1.5 text-xs font-semibold", card.color)}>
                                    {card.icon} {card.label}
                                </div>
                                <p className="text-2xl font-bold">{card.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Per-Popup Table */}
                    <div className="border rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-muted/40 border-b flex items-center justify-between">
                            <span className="text-sm font-semibold">Desempenho por Pop-up</span>
                            <button onClick={loadAnalytics} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                                Atualizar
                            </button>
                        </div>
                        <ScrollArea className="max-h-[500px]">
                            {loadingStats ? (
                                <div className="flex h-40 items-center justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : stats.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                                    <BarChart2 className="w-8 h-8 opacity-20" />
                                    <p className="text-sm">Nenhum dado ainda. Envie um pop-up primeiro.</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {stats.filter(p => p.views > 0 || p.clicks > 0 || true).map(p => (
                                        <div key={p.id} className="px-4 py-3 flex flex-col gap-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {p.type === "image"
                                                        ? <ImageIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                        : <Type className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                    }
                                                    <p className="text-sm font-medium truncate">
                                                        {p.title || (p.type === "image" ? "Imagem" : p.content?.slice(0, 40)) || "Pop-up"}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Eye className="w-3 h-3" /> {p.views}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <MousePointerClick className="w-3 h-3" /> {p.clicks}
                                                    </span>
                                                    <Badge className={cn(
                                                        "text-[10px] min-w-[38px] justify-center",
                                                        p.ctr >= 10 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                                            : p.ctr > 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                                                                : "bg-muted text-muted-foreground"
                                                    )}>{p.ctr}% CTR</Badge>
                                                </div>
                                            </div>
                                            {/* Progress bar */}
                                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                                                    style={{ width: `${Math.round((p.views / maxViews) * 100)}%` }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                                <span>{POSITION_LABEL[p.position ?? "bottom-right"]}</span>
                                                <span>·</span>
                                                <span>{format(new Date(p.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            )}

            {/* ── COMPOSE TAB ──────────────────────────────────────────── */}
            {activeTab === "compose" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-4">

                        {/* Type */}
                        <div className="border rounded-xl p-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Tipo de conteúdo</p>
                            <div className="flex gap-2">
                                {([
                                    { key: "text" as PopupType, label: "Texto", icon: <Type className="w-4 h-4" /> },
                                    { key: "image" as PopupType, label: "Imagem", icon: <ImageIcon className="w-4 h-4" /> },
                                ]).map(opt => (
                                    <button key={opt.key} onClick={() => setType(opt.key)}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 text-sm font-medium transition-all",
                                            type === opt.key
                                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300"
                                                : "border-border text-muted-foreground hover:bg-muted/50"
                                        )}>
                                        {opt.icon} {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Position */}
                        <div className="border rounded-xl p-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Posição no site</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {POSITION_OPTIONS.map(opt => (
                                    <button key={opt.value} onClick={() => setPosition(opt.value)}
                                        className={cn(
                                            "flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-lg border-2 text-xs font-medium transition-all min-w-0",
                                            position === opt.value
                                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300"
                                                : "border-border text-muted-foreground hover:bg-muted/50"
                                        )}>
                                        {opt.icon}
                                        <span className="font-semibold text-center leading-tight truncate w-full">{opt.label}</span>
                                        <span className="text-[10px] opacity-70 text-center leading-tight">{opt.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="border rounded-xl p-4 flex flex-col gap-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Conteúdo</p>

                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Título <span className="opacity-50">(opcional)</span></label>
                                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Oferta especial!" className="text-sm" />
                            </div>

                            {type === "text" ? (
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Mensagem *</label>
                                    <Textarea value={content} onChange={e => setContent(e.target.value)}
                                        placeholder="Texto do pop-up..." className="min-h-[90px] resize-none text-sm" />
                                </div>
                            ) : (
                                <>
                                    {/* Image upload area */}
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Imagem *</label>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }}
                                        />
                                        {imageUrl ? (
                                            <div className="relative">
                                                <img src={imageUrl} alt="preview"
                                                    className="rounded-lg w-full max-h-40 object-cover border" />
                                                <button
                                                    onClick={() => { setImageUrl(""); if (fileInputRef.current) fileInputRef.current.value = "" }}
                                                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-lg border-2 border-dashed border-border hover:border-indigo-400 hover:bg-indigo-50/5 transition-all text-muted-foreground">
                                                {uploading
                                                    ? <><Loader2 className="w-5 h-5 animate-spin" /><span className="text-xs">Enviando...</span></>
                                                    : <><Upload className="w-5 h-5" /><span className="text-xs font-medium">Clique para selecionar imagem</span><span className="text-[10px] opacity-60">JPG, PNG, GIF, WEBP • máx. 10MB</span></>
                                                }
                                            </button>
                                        )}
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                            <LinkIcon className="w-3 h-3" /> Link ao clicar <span className="opacity-50">(opcional)</span>
                                        </label>
                                        <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                                            placeholder="https://exemplo.com/oferta" className="text-sm" />
                                    </div>
                                </>
                            )}

                            {/* Schedule */}
                            <div>
                                <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                    <Calendar className="w-3 h-3" /> Agendar para <span className="opacity-50">(opcional)</span>
                                </label>
                                <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                                    className="text-sm" min={new Date().toISOString().slice(0, 16)} />
                            </div>
                        </div>

                        {/* Preview */}
                        {(content.trim() || imageUrl.trim()) && (
                            <div className="border rounded-xl p-3">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 font-medium">
                                    <Eye className="w-3.5 h-3.5" /> Pré-visualização — posição: {POSITION_LABEL[position]}
                                </div>
                                <div className={cn(
                                    "border bg-background overflow-hidden shadow-lg",
                                    position === "top" || position === "center" ? "w-full rounded-xl" : "w-64 rounded-xl"
                                )}>
                                    {type === "image" && imageUrl ? (
                                        <>
                                            <img src={imageUrl} alt="preview"
                                                className={cn("w-full object-cover", position === "top" ? "max-h-14" : "max-h-40")}
                                                onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                                            {title && <div className="px-3 py-2 text-xs font-semibold">{title}</div>}
                                        </>
                                    ) : (
                                        <div className={cn("px-4", position === "top" ? "py-2 flex items-center justify-center gap-3 text-center" : "py-4")}>
                                            {title && <p className="text-xs font-bold shrink-0">{title}</p>}
                                            <p className="text-xs text-muted-foreground">{content}</p>
                                        </div>
                                    )}
                                    <div className="h-0.5 bg-gradient-to-r from-purple-500 to-pink-500" />
                                </div>
                            </div>
                        )}

                        {/* Send */}
                        <Button onClick={handleSend} disabled={sending || !canSend}
                            className={cn(
                                "h-11 font-semibold gap-2",
                                isScheduledFuture
                                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90"
                                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90"
                            )}>
                            {sending
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                                : isScheduledFuture
                                    ? <><Calendar className="w-4 h-4" /> Agendar pop-up</>
                                    : <><Send className="w-4 h-4" /> Enviar agora</>
                            }
                        </Button>
                    </div>

                    {/* ── RIGHT: History ────────────────────────────────────── */}
                    <div className="border rounded-xl overflow-hidden flex flex-col">
                        <div className="px-4 py-3 bg-muted/40 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-semibold">Histórico</span>
                            </div>
                            <button onClick={loadHistory} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                                Atualizar
                            </button>
                        </div>
                        <ScrollArea className="flex-1 h-[560px]">
                            {loadingHistory ? (
                                <div className="flex h-40 items-center justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : popups.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                                    <Radio className="w-8 h-8 opacity-30" />
                                    <p className="text-sm">Nenhum pop-up enviado ainda.</p>
                                </div>
                            ) : (
                                <div className="p-3 space-y-2">
                                    {popups.map(p => (
                                        <div key={p.id} className={cn(
                                            "rounded-xl border p-3 space-y-2 transition-opacity",
                                            p.status === "dismissed" || p.status === "expired" ? "opacity-50" : ""
                                        )}>
                                            {/* Row 1: icon + badges */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {p.type === "image"
                                                        ? <ImageIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                        : <Type className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                    }
                                                    {STATUS_MAP[p.status]}
                                                    <Badge variant="outline" className="text-[10px]">{POSITION_LABEL[p.position ?? "bottom-right"]}</Badge>
                                                </div>
                                                {/* Delete */}
                                                {p.status !== "expired" && (
                                                    <button onClick={() => deletePopup(p.id)}
                                                        className="shrink-0 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Row 2: content */}
                                            {p.title && <p className="text-xs font-semibold truncate">{p.title}</p>}
                                            <p className="text-xs text-muted-foreground truncate">
                                                {p.type === "image" ? p.image_url : p.content}
                                            </p>
                                            {p.link_url && (
                                                <p className="text-[10px] text-indigo-400 truncate">{p.link_url}</p>
                                            )}

                                            {/* Row 3: time + toggle */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 min-w-0">
                                                <span className="text-[10px] text-muted-foreground truncate">
                                                    {p.scheduled_at
                                                        ? `Agendado: ${format(new Date(p.scheduled_at), "dd/MM/yy HH:mm", { locale: ptBR })}`
                                                        : formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: ptBR })
                                                    }
                                                </span>
                                                {/* Toggle active / dismissed (only if not scheduled or expired) */}
                                                {(p.status === "active" || p.status === "dismissed") && (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {p.status === "active" ? "Ativo" : "Inativo"}
                                                        </span>
                                                        <Switch
                                                            checked={p.status === "active"}
                                                            onCheckedChange={() => toggleStatus(p.id, p.status as PopupStatus)}
                                                            className="scale-75"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            )}
        </div>
    )
}
