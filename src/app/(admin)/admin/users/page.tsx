"use client"

import { useState, useEffect } from "react"
import { getUsers, updateUserRole, updateUserStatus, deleteUser } from "@/app/actions/admin-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, MoreHorizontal, Search, Trash, Shield, ShieldOff, Ban, CheckCircle, Eye, Users } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { ptBR } from "date-fns/locale"

function isOnline(lastSeen: string | null): boolean {
    if (!lastSeen) return false
    return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000
}

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [selectedUser, setSelectedUser] = useState<any>(null)

    const loadUsers = async () => {
        setLoading(true)
        const { users } = await getUsers(1, 50, search)
        setUsers(users || [])
        setLoading(false)
    }

    useEffect(() => {
        const debounce = setTimeout(loadUsers, 500)
        return () => clearTimeout(debounce)
    }, [search])

    const handleAction = async (action: string, userId: string, value?: any) => {
        if (!confirm("Tem certeza que deseja realizar esta ação?")) return

        let result
        if (action === "role") result = await updateUserRole(userId, value)
        if (action === "status") result = await updateUserStatus(userId, value)
        if (action === "delete") result = await deleteUser(userId)

        if (result?.success) {
            loadUsers()
        } else {
            alert("Erro ao realizar ação")
        }
    }

    const onlineCount = users.filter(u => isOnline(u.last_seen)).length

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gerenciar Usuários</h1>
                    <p className="text-muted-foreground mt-1">Visualize e gerencie todos os usuários cadastrados.</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 bg-card">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{users.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-green-500/30 px-3 py-1.5 bg-green-500/5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                        <span className="font-medium text-green-500">{onlineCount} online</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou email..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-lg border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead>Usuário</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Visto por último</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Nenhum usuário encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => {
                                const online = isOnline(user.last_seen)
                                return (
                                    <TableRow key={user.id} className="hover:bg-muted/20 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-semibold">
                                                        {(user.full_name || user.email || "?").charAt(0).toUpperCase()}
                                                    </div>
                                                    {online && (
                                                        <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border-2 border-background" />
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{user.full_name || "Sem nome"}</span>
                                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={user.status === 'active'
                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                                                : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                                            }>
                                                {user.status === 'active' ? 'Ativo' : 'Banido'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={user.role === 'admin'
                                                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20'
                                                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20'
                                            }>
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {online
                                                ? <span className="text-green-500 font-medium">Online agora</span>
                                                : user.last_seen
                                                    ? formatDistanceToNow(new Date(user.last_seen), { addSuffix: true, locale: ptBR })
                                                    : '-'
                                            }
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Ver Detalhes
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                                                        Copiar ID
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleAction('role', user.id, user.role === 'admin' ? 'user' : 'admin')}>
                                                        {user.role === 'admin' ? <ShieldOff className="mr-2 h-4 w-4" /> : <Shield className="mr-2 h-4 w-4" />}
                                                        {user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAction('status', user.id, user.status === 'active' ? 'banned' : 'active')}>
                                                        {user.status === 'active' ? <Ban className="mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                                        {user.status === 'active' ? 'Banir Usuário' : 'Reativar Usuário'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-600" onClick={() => handleAction('delete', user.id)}>
                                                        <Trash className="mr-2 h-4 w-4" />
                                                        Excluir Permanentemente
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* User Details Dialog */}
            <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Usuário</DialogTitle>
                        <DialogDescription>Informações completas do cadastro.</DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg font-bold">
                                        {(selectedUser.full_name || selectedUser.email || "?").charAt(0).toUpperCase()}
                                    </div>
                                    {isOnline(selectedUser.last_seen) && (
                                        <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-background" />
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">{selectedUser.full_name || "Sem nome"}</h3>
                                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border p-3">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Status</p>
                                    <p className="text-sm font-semibold mt-1">
                                        {isOnline(selectedUser.last_seen)
                                            ? <span className="text-green-500">🟢 Online</span>
                                            : selectedUser.status === 'active'
                                                ? <span>Ativo (Offline)</span>
                                                : <span className="text-red-500">Banido</span>
                                        }
                                    </p>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Role</p>
                                    <p className="text-sm font-semibold mt-1">{selectedUser.role === 'admin' ? '🛡️ Admin' : '👤 User'}</p>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Cadastro</p>
                                    <p className="text-sm font-semibold mt-1">{selectedUser.created_at ? format(new Date(selectedUser.created_at), "dd/MM/yyyy", { locale: ptBR }) : '-'}</p>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Último Acesso</p>
                                    <p className="text-sm font-semibold mt-1">
                                        {isOnline(selectedUser.last_seen)
                                            ? <span className="text-green-500">Agora</span>
                                            : selectedUser.last_seen
                                                ? formatDistanceToNow(new Date(selectedUser.last_seen), { addSuffix: true, locale: ptBR })
                                                : '-'
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-lg border p-3">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">ID do Usuário</p>
                                <p className="text-xs font-mono mt-1 text-muted-foreground break-all">{selectedUser.id}</p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
