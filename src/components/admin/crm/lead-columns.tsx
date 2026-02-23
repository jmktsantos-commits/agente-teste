"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DBLead } from "@/services/crm"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, MessageCircle, Mail } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"

export const columns: ColumnDef<DBLead>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "full_name",
        header: "Nome",
        cell: ({ row }) => (
            <div className="flex flex-col">
                <Link href={`/crm/${row.original.id}`} className="font-medium hover:underline">
                    {row.getValue("full_name")}
                </Link>
                <span className="text-xs text-muted-foreground">{row.original.email}</span>
            </div>
        ),
    },
    {
        id: "online",
        header: "Online",
        cell: ({ row }) => {
            const lastSeen = (row.original as any).last_seen_at as string | undefined
            if (!lastSeen) {
                return (
                    <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                        <span className="text-xs text-muted-foreground">Nunca</span>
                    </div>
                )
            }

            const lastSeenDate = new Date(lastSeen)
            const diffMin = Math.floor((Date.now() - lastSeenDate.getTime()) / 60000)
            const isOnline = diffMin < 5

            // Format exact last access
            const today = new Date()
            const isToday = lastSeenDate.toDateString() === today.toDateString()
            const isYesterday = new Date(today.setDate(today.getDate() - 1)).toDateString() === lastSeenDate.toDateString()
            const timeStr = lastSeenDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
            const dateStr = isToday
                ? `hoje às ${timeStr}`
                : isYesterday
                    ? `ontem às ${timeStr}`
                    : `${lastSeenDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${timeStr}`

            if (isOnline) {
                return (
                    <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_2px_rgba(34,197,94,0.5)] shrink-0" />
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400">Online</span>
                    </div>
                )
            }

            return (
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-500 shrink-0" />
                        <span className="text-xs font-medium text-muted-foreground">Offline</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/70 pl-3.5">{dateStr}</span>
                </div>
            )
        },
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string
            const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
                new: "default",
                contacted: "secondary",
                interested: "secondary", // was "warning" but badge doesn't have it by default
                converted: "default", // was "success"
                lost: "destructive",
            }
            return <Badge variant={variants[status] || "outline"}>{status.toUpperCase()}</Badge>
        },
    },
    {
        accessorKey: "source",
        header: "Origem",
        cell: ({ row }) => <span className="capitalize text-sm">{row.getValue("source")}</span>,
    },
    {
        accessorKey: "created_at",
        header: "Cadastro",
        cell: ({ row }) => {
            const date = new Date(row.getValue("created_at"))
            return <span className="text-sm">{date.toLocaleDateString("pt-BR")}</span>
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const lead = row.original

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(lead.id)}>
                            Copiar ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" /> Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href={`/crm/${lead.id}`} className="w-full cursor-pointer">Ver Detalhes</Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]
