"use client"

import { useEffect, useState, useCallback } from "react"
import {
    Plus, Trash2, Pencil, ChevronDown, ChevronUp, Eye, EyeOff,
    GraduationCap, Play, Loader2, X, Check, MoveUp, MoveDown,
    Link as LinkIcon, Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Lesson {
    id: string
    module_id: string
    title: string
    video_url: string | null
    duration: string | null
    position: number
    is_published: boolean
}

interface Module {
    id: string
    title: string
    description: string | null
    position: number
    is_published: boolean
    course_lessons: Lesson[]
}

// ===== Video URL helpers =====
function getEmbedUrl(url: string): string | null {
    if (!url) return null
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/)
    if (ytMatch) return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?byline=0&portrait=0`
    // Direct video file
    if (/\.(mp4|webm|ogg)/i.test(url)) return url
    return null
}

function VideoPreview({ url }: { url: string }) {
    const embedUrl = getEmbedUrl(url)
    if (!embedUrl) return <p className="text-xs text-muted-foreground">URL de vídeo inválida</p>
    if (/\.(mp4|webm|ogg)/i.test(embedUrl)) {
        return <video src={embedUrl} controls className="w-full rounded-lg aspect-video bg-black" />
    }
    return (
        <iframe
            src={embedUrl}
            className="w-full rounded-lg aspect-video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
        />
    )
}

// ===== Lesson Form Modal =====
function LessonModal({
    moduleId,
    lesson,
    onClose,
    onSave,
}: {
    moduleId: string
    lesson?: Lesson
    onClose: () => void
    onSave: (lesson: Lesson) => void
}) {
    const [title, setTitle] = useState(lesson?.title || "")
    const [videoUrl, setVideoUrl] = useState(lesson?.video_url || "")
    const [duration, setDuration] = useState(lesson?.duration || "")
    const [saving, setSaving] = useState(false)
    const [previewUrl, setPreviewUrl] = useState(lesson?.video_url || "")

    async function handleSave() {
        if (!title.trim()) { toast.error("Título obrigatório"); return }
        setSaving(true)
        try {
            const isEdit = !!lesson?.id
            const res = await fetch(
                isEdit ? `/api/admin/courses/lessons/${lesson.id}` : `/api/admin/courses/lessons`,
                {
                    method: isEdit ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ module_id: moduleId, title, video_url: videoUrl, duration }),
                }
            )
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success(isEdit ? "Aula atualizada!" : "Aula criada!")
            onSave(data)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Erro ao salvar")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-lg font-bold">{lesson ? "Editar Aula" : "Nova Aula"}</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1.5 block">Título da Aula *</label>
                        <Input
                            placeholder="Ex: Como funciona o Aviator"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                            <LinkIcon className="h-3.5 w-3.5" /> Link do Vídeo
                        </label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://youtube.com/watch?v=... ou Vimeo"
                                value={videoUrl}
                                onChange={e => setVideoUrl(e.target.value)}
                            />
                            <Button variant="outline" size="icon" onClick={() => setPreviewUrl(videoUrl)} title="Preview">
                                <Play className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Suporte: YouTube, Vimeo, MP4 direto</p>
                    </div>
                    {previewUrl && (
                        <div className="rounded-xl overflow-hidden border">
                            <VideoPreview url={previewUrl} />
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" /> Duração
                        </label>
                        <Input
                            placeholder="Ex: 12:30"
                            value={duration}
                            onChange={e => setDuration(e.target.value)}
                            className="w-32"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 p-6 border-t">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                        Salvar Aula
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ===== Module Form Modal =====
function ModuleModal({
    module,
    onClose,
    onSave,
}: {
    module?: Module
    onClose: () => void
    onSave: (m: Module) => void
}) {
    const [title, setTitle] = useState(module?.title || "")
    const [description, setDescription] = useState(module?.description || "")
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        if (!title.trim()) { toast.error("Título obrigatório"); return }
        setSaving(true)
        try {
            const isEdit = !!module?.id
            const res = await fetch(
                isEdit ? `/api/admin/courses/modules/${module.id}` : `/api/admin/courses/modules`,
                {
                    method: isEdit ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, description }),
                }
            )
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success(isEdit ? "Módulo atualizado!" : "Módulo criado!")
            onSave(data)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Erro ao salvar")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-lg font-bold">{module ? "Editar Módulo" : "Novo Módulo"}</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1.5 block">Nome do Módulo *</label>
                        <Input
                            placeholder="Ex: Módulo 1 — Fundamentos"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1.5 block">Descrição (opcional)</label>
                        <Textarea
                            placeholder="Descreva o que o aluno vai aprender neste módulo..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 p-6 border-t">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                        Salvar Módulo
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ===== Main Page =====
export default function AdminCoursesPage() {
    const [modules, setModules] = useState<Module[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
    const [moduleModal, setModuleModal] = useState<{ open: boolean; module?: Module }>({ open: false })
    const [lessonModal, setLessonModal] = useState<{ open: boolean; moduleId?: string; lesson?: Lesson }>({ open: false })
    const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null)

    const fetchModules = useCallback(async () => {
        setLoading(true)
        const res = await fetch("/api/admin/courses/modules")
        const data = await res.json()
        setModules(Array.isArray(data) ? data : [])
        setLoading(false)
    }, [])

    useEffect(() => { fetchModules() }, [fetchModules])

    function toggleExpand(id: string) {
        setExpandedModules(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    async function toggleModulePublished(mod: Module) {
        const res = await fetch(`/api/admin/courses/modules/${mod.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_published: !mod.is_published }),
        })
        if (res.ok) {
            setModules(prev => prev.map(m => m.id === mod.id ? { ...m, is_published: !m.is_published } : m))
            toast.success(mod.is_published ? "Módulo ocultado dos membros" : "Módulo publicado!")
        }
    }

    async function deleteModule(id: string) {
        if (!confirm("Apagar módulo e todas as suas aulas?")) return
        const res = await fetch(`/api/admin/courses/modules/${id}`, { method: "DELETE" })
        if (res.ok) {
            setModules(prev => prev.filter(m => m.id !== id))
            toast.success("Módulo apagado")
        }
    }

    async function moveModule(id: string, dir: "up" | "down") {
        const idx = modules.findIndex(m => m.id === id)
        const swapIdx = dir === "up" ? idx - 1 : idx + 1
        if (swapIdx < 0 || swapIdx >= modules.length) return

        const newModules = [...modules]
        ;[newModules[idx], newModules[swapIdx]] = [newModules[swapIdx], newModules[idx]]
        setModules(newModules)

        await Promise.all([
            fetch(`/api/admin/courses/modules/${newModules[idx].id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ position: idx }),
            }),
            fetch(`/api/admin/courses/modules/${newModules[swapIdx].id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ position: swapIdx }),
            }),
        ])
    }

    async function toggleLessonPublished(lesson: Lesson) {
        const res = await fetch(`/api/admin/courses/lessons/${lesson.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_published: !lesson.is_published }),
        })
        if (res.ok) {
            setModules(prev => prev.map(m => ({
                ...m,
                course_lessons: m.course_lessons.map(l =>
                    l.id === lesson.id ? { ...l, is_published: !l.is_published } : l
                )
            })))
            toast.success(lesson.is_published ? "Aula ocultada" : "Aula publicada!")
        }
    }

    async function deleteLesson(lessonId: string, moduleId: string) {
        if (!confirm("Apagar esta aula?")) return
        const res = await fetch(`/api/admin/courses/lessons/${lessonId}`, { method: "DELETE" })
        if (res.ok) {
            setModules(prev => prev.map(m =>
                m.id === moduleId ? { ...m, course_lessons: m.course_lessons.filter(l => l.id !== lessonId) } : m
            ))
            toast.success("Aula apagada")
        }
    }

    async function moveLesson(lesson: Lesson, dir: "up" | "down") {
        const mod = modules.find(m => m.id === lesson.module_id)
        if (!mod) return
        const lessons = [...mod.course_lessons].sort((a, b) => a.position - b.position)
        const idx = lessons.findIndex(l => l.id === lesson.id)
        const swapIdx = dir === "up" ? idx - 1 : idx + 1
        if (swapIdx < 0 || swapIdx >= lessons.length) return;
        [lessons[idx], lessons[swapIdx]] = [lessons[swapIdx], lessons[idx]]
        setModules(prev => prev.map(m => m.id === lesson.module_id ? { ...m, course_lessons: lessons } : m))
        await Promise.all([
            fetch(`/api/admin/courses/lessons/${lessons[idx].id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ position: idx }),
            }),
            fetch(`/api/admin/courses/lessons/${lessons[swapIdx].id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ position: swapIdx }),
            }),
        ])
    }

    const totalLessons = modules.reduce((acc, m) => acc + m.course_lessons.length, 0)
    const publishedModules = modules.filter(m => m.is_published).length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <GraduationCap className="h-6 w-6 text-primary" />
                        Cursos & Aulas
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Gerencie os módulos e aulas do mini curso. Alterações são refletidas imediatamente na área dos membros.
                    </p>
                </div>
                <Button onClick={() => setModuleModal({ open: true })} className="gap-2 shrink-0">
                    <Plus className="h-4 w-4" /> Novo Módulo
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Módulos", value: modules.length, sub: `${publishedModules} publicados` },
                    { label: "Aulas", value: totalLessons, sub: "no total" },
                    { label: "Publicados", value: publishedModules, sub: "módulos visíveis" },
                ].map(stat => (
                    <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-sm font-medium">{stat.label}</p>
                        <p className="text-xs text-muted-foreground">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* Modules List */}
            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : modules.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-2xl text-muted-foreground">
                    <GraduationCap className="h-10 w-10 mb-3 opacity-30" />
                    <p className="font-medium">Nenhum módulo ainda</p>
                    <p className="text-sm">Clique em &quot;Novo Módulo&quot; para começar</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {modules.map((mod, modIdx) => (
                        <div
                            key={mod.id}
                            className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
                        >
                            {/* Module Header */}
                            <div className="flex items-center justify-between px-5 py-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {/* Reorder arrows */}
                                    <div className="flex flex-col gap-0.5 shrink-0">
                                        <button onClick={() => moveModule(mod.id, "up")} disabled={modIdx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                                            <MoveUp className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={() => moveModule(mod.id, "down")} disabled={modIdx === modules.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                                            <MoveDown className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => toggleExpand(mod.id)}
                                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                    >
                                        <div className={cn(
                                            "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold shrink-0",
                                            mod.is_published ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                        )}>
                                            {modIdx + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold truncate">{mod.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {mod.course_lessons.length} aula{mod.course_lessons.length !== 1 ? "s" : ""}
                                                {mod.description && ` · ${mod.description.substring(0, 50)}${mod.description.length > 50 ? "..." : ""}`}
                                            </p>
                                        </div>
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => toggleModulePublished(mod)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                                            mod.is_published
                                                ? "bg-green-500/15 text-green-500 border-green-500/30 hover:bg-green-500/25"
                                                : "bg-muted text-muted-foreground border-border hover:bg-accent"
                                        )}
                                        title={mod.is_published ? "Clique para ocultar" : "Clique para publicar"}
                                    >
                                        {mod.is_published
                                            ? <><Eye className="h-3.5 w-3.5" /> Publicado</>
                                            : <><EyeOff className="h-3.5 w-3.5" /> Rascunho</>
                                        }
                                    </button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setModuleModal({ open: true, module: mod })}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteModule(mod.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <button onClick={() => toggleExpand(mod.id)} className="text-muted-foreground">
                                        {expandedModules.has(mod.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Lessons */}
                            {expandedModules.has(mod.id) && (
                                <div className="border-t border-border px-5 pb-4">
                                    <div className="space-y-2 mt-4">
                                        {[...mod.course_lessons]
                                            .sort((a, b) => a.position - b.position)
                                            .map((lesson, lessonIdx) => (
                                                <div
                                                    key={lesson.id}
                                                    className="flex items-center gap-3 bg-background rounded-xl px-4 py-3 border border-border/50"
                                                >
                                                    {/* Lesson order arrows */}
                                                    <div className="flex flex-col gap-0.5 shrink-0">
                                                        <button onClick={() => moveLesson(lesson, "up")} disabled={lessonIdx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                                                            <MoveUp className="h-3 w-3" />
                                                        </button>
                                                        <button onClick={() => moveLesson(lesson, "down")} disabled={lessonIdx === mod.course_lessons.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                                                            <MoveDown className="h-3 w-3" />
                                                        </button>
                                                    </div>

                                                    {/* Play button */}
                                                    <button
                                                        onClick={() => setPreviewLesson(lesson.video_url ? lesson : null)}
                                                        className={cn(
                                                            "flex h-8 w-8 items-center justify-center rounded-full shrink-0 transition-colors",
                                                            lesson.video_url
                                                                ? "bg-primary/10 text-primary hover:bg-primary/20"
                                                                : "bg-muted text-muted-foreground cursor-default"
                                                        )}
                                                        disabled={!lesson.video_url}
                                                        title={lesson.video_url ? "Pré-visualizar vídeo" : "Sem vídeo"}
                                                    >
                                                        <Play className="h-3.5 w-3.5" />
                                                    </button>

                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{lesson.title}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {lesson.duration && (
                                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />{lesson.duration}
                                                                </span>
                                                            )}
                                                            {lesson.video_url && (
                                                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                                    {lesson.video_url.substring(0, 40)}...
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <button
                                                            onClick={() => toggleLessonPublished(lesson)}
                                                            className={cn(
                                                                "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                                                                lesson.is_published
                                                                    ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
                                                                    : "bg-muted text-muted-foreground border-border hover:bg-accent"
                                                            )}
                                                            title={lesson.is_published ? "Clique para ocultar" : "Clique para publicar"}
                                                        >
                                                            {lesson.is_published
                                                                ? <><Eye className="h-3 w-3" /> Visível</>
                                                                : <><EyeOff className="h-3 w-3" /> Oculto</>
                                                            }
                                                        </button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7"
                                                            onClick={() => setLessonModal({ open: true, moduleId: mod.id, lesson })}>
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                                            onClick={() => deleteLesson(lesson.id, mod.id)}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>

                                    {/* Add lesson button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-3 gap-2 w-full border-dashed"
                                        onClick={() => setLessonModal({ open: true, moduleId: mod.id })}
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Adicionar Aula
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Video Preview Modal */}
            {previewLesson && previewLesson.video_url && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPreviewLesson(null)}>
                    <div className="w-full max-w-3xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-white font-medium">{previewLesson.title}</p>
                            <Button variant="ghost" size="icon" onClick={() => setPreviewLesson(null)} className="text-white">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <VideoPreview url={previewLesson.video_url} />
                    </div>
                </div>
            )}

            {/* Modals */}
            {moduleModal.open && (
                <ModuleModal
                    module={moduleModal.module}
                    onClose={() => setModuleModal({ open: false })}
                    onSave={(saved) => {
                        setModules(prev => {
                            const exists = prev.find(m => m.id === saved.id)
                            if (exists) return prev.map(m => m.id === saved.id ? { ...m, ...saved } : m)
                            return [...prev, { ...saved, course_lessons: [] }]
                        })
                        setModuleModal({ open: false })
                    }}
                />
            )}

            {lessonModal.open && lessonModal.moduleId && (
                <LessonModal
                    moduleId={lessonModal.moduleId}
                    lesson={lessonModal.lesson}
                    onClose={() => setLessonModal({ open: false })}
                    onSave={(saved) => {
                        setModules(prev => prev.map(m => {
                            if (m.id !== lessonModal.moduleId) return m
                            const exists = m.course_lessons.find(l => l.id === saved.id)
                            return {
                                ...m,
                                course_lessons: exists
                                    ? m.course_lessons.map(l => l.id === saved.id ? saved : l)
                                    : [...m.course_lessons, saved]
                            }
                        }))
                        setLessonModal({ open: false })
                    }}
                />
            )}
        </div>
    )
}
