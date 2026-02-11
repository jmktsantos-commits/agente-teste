"use client"

import { ChatWindow } from "@/components/features/chat/chat-window"

export default function ChatPage() {
    return (
        <div className="h-[calc(100vh-theme(spacing.32))]">
            <ChatWindow />
        </div>
    )
}
