"use client"

import { PlayCircle, BookOpen, CheckCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const modules = [
    {
        title: "Módulo 1: Fundamentos",
        lessons: [
            { title: "Como funciona o Aviator", duration: "5:20", completed: true },
            { title: "Gestão de Banca Básica", duration: "8:15", completed: true },
            { title: "Psicologia do Jogador", duration: "12:00", completed: false },
        ]
    },
    {
        title: "Módulo 2: Estratégias Avançadas",
        lessons: [
            { title: "Análise de Padrões", duration: "15:30", completed: false },
            { title: "O momento certo de entrar", duration: "10:45", completed: false },
            { title: "Stop Loss e Stop Win", duration: "9:20", completed: false },
        ]
    }
]

export default function EducationPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Central de Aprendizado</h1>
                <Badge variant="secondary">Progresso: 33%</Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {modules.map((module, i) => (
                    <Card key={i} className="bg-slate-900 border-slate-800 text-white">
                        <CardHeader>
                            <CardTitle>{module.title}</CardTitle>
                            <CardDescription className="text-slate-400">
                                {module.lessons.length} aulas
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {module.lessons.map((lesson, j) => (
                                    <div key={j} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${lesson.completed ? "bg-green-500/20 text-green-500" : "bg-slate-700 text-slate-400"}`}>
                                                {lesson.completed ? <CheckCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium group-hover:text-primary transition-colors">{lesson.title}</p>
                                                <p className="text-xs text-slate-500">{lesson.duration}</p>
                                            </div>
                                        </div>
                                        {lesson.completed ? (
                                            <Badge variant="outline" className="border-green-500/50 text-green-500 text-[10px]">Concluído</Badge>
                                        ) : (
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 group-hover:text-white">
                                                <PlayCircle className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
