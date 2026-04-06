"use client"

import { useEffect, useState, useCallback } from "react"
import { PlayCircle, CheckCircle, BookOpen, GraduationCap, Clock, ChevronDown, ChevronUp, X, Loader2, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

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

function getEmbedUrl(url: string): string | null {
    if (!url) return null
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/)
    if (ytMatch) return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1&autoplay=1`
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?byline=0&portrait=0&autoplay=1`
    if (/\.(mp4|webm|ogg)/i.test(url)) return url
    return null
}

function VideoPlayer({ lesson, onClose, onComplete }: {
    lesson: Lesson
    onClose: () => void
    onComplete: (id: string) => void
}) {
    const embedUrl = lesson.video_url ? getEmbedUrl(lesson.video_url) : null

    async function handleComplete() {
        try {
            await fetch("/api/courses/progress", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lesson_id: lesson.id }),
            })
            onComplete(lesson.id)
            toast.success("Aula marcada como concluída! ✅")
        } catch {
            toast.error("Erro ao salvar progresso")
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-white font-bold text-lg">{lesson.title}</h2>
                        {lesson.duration && (
                            <p className="text-white/60 text-sm flex items-center gap-1 mt-1">
                                <Clock className="h-3.5 w-3.5" /> {lesson.duration}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700" onClick={handleComplete}>
                            <CheckCircle className="h-4 w-4" /> Marcar como concluída
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:text-white/80">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Player */}
                {embedUrl ? (
                    /\.(mp4|webm|ogg)/i.test(embedUrl) ? (
                        <video src={embedUrl} controls autoPlay className="w-full rounded-2xl aspect-video bg-black" />
                    ) : (
                        <iframe
                            src={embedUrl}
                            className="w-full rounded-2xl aspect-video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    )
                ) : (
                    <div className="w-full aspect-video rounded-2xl bg-slate-900 flex items-center justify-center">
                        <p className="text-white/40">Vídeo não disponível</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function EducationPage() {
    const [modules, setModules] = useState<Module[]>([])
    const [loading, setLoading] = useState(true)
    const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set())
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
    const [fetchError, setFetchError] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        setFetchError(null)
        try {
            // Use API route (service_role key) — bypasses RLS
            // This works even if RLS policies aren't configured in Supabase
            const modulesRes = await fetch("/api/courses/modules")
            if (!modulesRes.ok) {
                const err = await modulesRes.json().catch(() => ({}))
                throw new Error(err.error || `HTTP ${modulesRes.status}`)
            }
            const modulesData = await modulesRes.json()

            if (Array.isArray(modulesData)) {
                setModules(modulesData)
                setExpandedModules(new Set(modulesData.map((m: Module) => m.id)))
            }

            // Fetch user progress
            const progressRes = await fetch("/api/courses/progress")
            if (progressRes.ok) {
                const progressData = await progressRes.json()
                setCompletedLessons(new Set(progressData.map((p: { lesson_id: string }) => p.lesson_id)))
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Erro desconhecido'
            console.error("Error fetching course data:", msg)
            setFetchError(msg)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    function toggleModule(id: string) {
        setExpandedModules(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    // Stats
    const totalLessons = modules.reduce((acc, m) => acc + m.course_lessons.length, 0)
    const completedCount = modules.reduce((acc, m) =>
        acc + m.course_lessons.filter(l => completedLessons.has(l.id)).length, 0
    )
    const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <GraduationCap className="h-6 w-6 text-primary" />
                        Central de Aprendizado
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Aprenda estratégias e técnicas para maximizar seus resultados</p>
                </div>
                {totalLessons > 0 && (
                    <Badge variant="secondary" className="text-sm">
                        Progresso: {progressPercent}%
                    </Badge>
                )}
            </div>

            {/* Progress bar */}
            {totalLessons > 0 && (
                <div className="bg-slate-800 rounded-xl p-4">
                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                        <span>{completedCount} de {totalLessons} aulas concluídas</span>
                        <span>{progressPercent}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : fetchError ? (
                <div className="flex flex-col items-center justify-center h-48 bg-red-500/5 rounded-2xl border border-red-500/20 text-slate-400">
                    <AlertCircle className="h-10 w-10 mb-3 text-red-500/50" />
                    <p className="font-medium text-red-400">Erro ao carregar o conteúdo</p>
                    <p className="text-xs text-slate-500 mt-1">{fetchError}</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>Tentar novamente</Button>
                </div>
            ) : modules.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 bg-slate-900 rounded-2xl border border-slate-800 text-slate-400">
                    <BookOpen className="h-10 w-10 mb-3 opacity-30" />
                    <p className="font-medium">Nenhum conteúdo disponível ainda</p>
                    <p className="text-sm text-slate-500">Em breve novos módulos serão adicionados</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {modules.map((module, modIdx) => {
                        const moduleLessons = module.course_lessons
                        const moduleCompleted = moduleLessons.filter(l => completedLessons.has(l.id)).length
                        const moduleProgress = moduleLessons.length > 0
                            ? Math.round((moduleCompleted / moduleLessons.length) * 100)
                            : 0
                        const isExpanded = expandedModules.has(module.id)

                        return (
                            <div key={module.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                                {/* Module header */}
                                <button
                                    onClick={() => toggleModule(module.id)}
                                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={cn(
                                            "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold shrink-0",
                                            moduleProgress === 100
                                                ? "bg-green-500/20 text-green-400"
                                                : "bg-primary/10 text-primary"
                                        )}>
                                            {moduleProgress === 100 ? <CheckCircle className="h-5 w-5" /> : modIdx + 1}
                                        </div>
                                        <div className="text-left min-w-0">
                                            <p className="font-semibold text-white">{module.title}</p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-xs text-slate-400">
                                                    {moduleLessons.length} aula{moduleLessons.length !== 1 ? "s" : ""}
                                                </span>
                                                <span className="text-xs text-slate-500">•</span>
                                                <span className="text-xs text-slate-400">{moduleCompleted}/{moduleLessons.length} concluídas</span>
                                                {moduleProgress > 0 && moduleProgress < 100 && (
                                                    <span className="text-xs text-primary font-medium">{moduleProgress}%</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        {moduleProgress === 100 && (
                                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                                Concluído ✓
                                            </Badge>
                                        )}
                                        {isExpanded ? (
                                            <ChevronUp className="h-4 w-4 text-slate-400" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-slate-400" />
                                        )}
                                    </div>
                                </button>

                                {/* Module description */}
                                {module.description && isExpanded && (
                                    <div className="px-5 pb-2">
                                        <p className="text-sm text-slate-400">{module.description}</p>
                                    </div>
                                )}

                                {/* Lessons list */}
                                {isExpanded && (
                                    <div className="border-t border-slate-800 px-5 py-3 space-y-2">
                                        {moduleLessons.map((lesson) => {
                                            const isDone = completedLessons.has(lesson.id)
                                            return (
                                                <div
                                                    key={lesson.id}
                                                    onClick={() => setActiveLesson(lesson)}
                                                    className={cn(
                                                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer group transition-all",
                                                        isDone
                                                            ? "bg-green-500/5 border border-green-500/20 hover:bg-green-500/10"
                                                            : "bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-slate-700"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "flex h-9 w-9 items-center justify-center rounded-full shrink-0 transition-colors",
                                                        isDone
                                                            ? "bg-green-500/20 text-green-400"
                                                            : "bg-slate-700 text-slate-400 group-hover:bg-primary/20 group-hover:text-primary"
                                                    )}>
                                                        {isDone
                                                            ? <CheckCircle className="h-4 w-4" />
                                                            : <PlayCircle className="h-4 w-4" />
                                                        }
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={cn(
                                                            "text-sm font-medium group-hover:text-primary transition-colors",
                                                            isDone ? "text-slate-300" : "text-white"
                                                        )}>
                                                            {lesson.title}
                                                        </p>
                                                        {lesson.duration && (
                                                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                                <Clock className="h-3 w-3" /> {lesson.duration}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {isDone ? (
                                                        <Badge variant="outline" className="border-green-500/30 text-green-400 text-[10px] shrink-0">
                                                            Concluído
                                                        </Badge>
                                                    ) : (
                                                        <Button size="sm" variant="ghost" className="text-xs text-slate-400 group-hover:text-primary shrink-0">
                                                            Assistir
                                                        </Button>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Video Player Modal */}
            {activeLesson && (
                <VideoPlayer
                    lesson={activeLesson}
                    onClose={() => setActiveLesson(null)}
                    onComplete={(id) => {
                        setCompletedLessons(prev => new Set([...prev, id]))
                        setActiveLesson(null)
                    }}
                />
            )}
        </div>
    )
}
