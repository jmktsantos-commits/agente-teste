"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Props {
    children?: ReactNode
    name?: string
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo)
    }

    public render() {
        if (this.state.hasError) {
            return (
                <Alert variant="destructive" className="bg-red-900/20 border-red-900/50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro no componente: {this.props.name || 'Desconhecido'}</AlertTitle>
                    <AlertDescription className="text-xs font-mono mt-1">
                        {this.state.error?.message || "Erro desconhecido"}
                    </AlertDescription>
                </Alert>
            )
        }

        return this.props.children
    }
}
