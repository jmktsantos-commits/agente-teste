"use client"

import { SupportChat } from "@/components/features/support/support-chat"

export default function SupportPage() {
    return (
        <div className="h-[calc(100vh-theme(spacing.32))] max-w-2xl mx-auto">
            <SupportChat />
        </div>
    )
}
