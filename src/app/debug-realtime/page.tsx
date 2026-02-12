"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function DebugRealtimePage() {
    const [events, setEvents] = useState<any[]>([]);
    const [status, setStatus] = useState("DISCONNECTED");
    const supabase = createClient();

    useEffect(() => {
        const channel = supabase
            .channel("debug_realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "crash_history" },
                (payload) => {
                    console.log("🔥 Payload received:", payload);
                    setEvents((prev) => [payload, ...prev]);
                }
            )
            .subscribe((status, err) => {
                setStatus(status);
                if (err) console.error("Subscription error:", err);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="p-8 bg-slate-900 min-h-screen text-white font-mono">
            <h1 className="text-2xl font-bold mb-4">Debug Realtime</h1>
            <div className="mb-4">
                Status: <span className={status === "SUBSCRIBED" ? "text-green-500" : "text-yellow-500"}>{status}</span>
            </div>

            <div className="border border-slate-700 rounded p-4 h-[600px] overflow-auto">
                {events.length === 0 && <div className="text-slate-500">Waiting for events...</div>}
                {events.map((e, i) => (
                    <div key={i} className="mb-2 border-b border-slate-800 pb-2">
                        <div className="text-xs text-slate-400">{new Date().toISOString()}</div>
                        <pre className="text-xs text-green-400 overflow-x-auto">
                            {JSON.stringify(e, null, 2)}
                        </pre>
                    </div>
                ))}
            </div>
        </div>
    );
}
