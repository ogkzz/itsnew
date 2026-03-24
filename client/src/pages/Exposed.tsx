import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  Search, Plus, UserX, Edit, Trash2, Loader2, Users, MessageSquare,
  Calendar, ExternalLink, AlertOctagon, ShieldCheck, Clock, Ban
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useLocalAuth } from "@/contexts/AuthContext";

function getStatusConfig(status: string) {
  switch (status) {
    case "active": return { label: "Ativo", icon: AlertOctagon, className: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    case "banned": return { label: "Banido", icon: Ban, className: "bg-red-500/10 text-red-400 border-red-500/20" };
    case "under_review": return { label: "Em Revisão", icon: Clock, className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" };
    case "cleared": return { label: "Limpo", icon: ShieldCheck, className: "bg-green-500/10 text-green-400 border-green-500/20" };
    default: return { label: status, icon: AlertOctagon, className: "" };
  }
}

export default function Exposed() {
  const { username } = useLocalAuth();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [nameId, setNameId] = useState("");
  const [discord, setDiscord] = useState("");
  const [photo, setPhoto] = useState("");
  const [description, setDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "banned" | "under_review" | "cleared">("active");

  const { data: exposedList } = trpc.exposed.list.useQuery({
    limit: 50, offset: 0,
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const createMutation = trpc.exposed.create.useMutation({
    onSuccess: () => {
      toast.success("Registro criado com sucesso!");
      resetForm();
      setDialogOpen(false);
      utils.exposed.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.exposed.update.useMutation({
    onSuccess: () => {
      toast.success("Registro atualizado!");
      resetForm();
      setDialogOpen(false);
      utils.exposed.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.exposed.delete.useMutation({
    onSuccess: () => {
      toast.success("Registro removido!");
      utils.exposed.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setNameId(""); setDiscord(""); setPhoto(""); setDescription(""); setFormStatus("active"); setEditingId(null);
  }

  function openEdit(item: any) {
    setEditingId(item.id);
    setNameId(item.nameId);
    setDiscord(item.discord || "");
    setPhoto(item.photo || "");
    setDescription(item.description || "");
    setFormStatus(item.status);
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!nameId.trim()) { toast.error("Nome/ID é obrigatório"); return; }
    if (editingId) {
      updateMutation.mutate({ id: editingId, nameId: nameId.trim(), discord: discord.trim() || undefined, photo: photo.trim() || undefined, description: description.trim() || undefined, status: formStatus });
    } else {
      createMutation.mutate({ nameId: nameId.trim(), discord: discord.trim() || undefined, photo: photo.trim() || undefined, description: description.trim() || undefined, status: formStatus, username: username || "free" });
    }
  }

  const totalCount = exposedList?.length || 0;
  const bannedCount = exposedList?.filter(i => i.status === "banned").length || 0;
  const reviewCount = exposedList?.filter(i => i.status === "under_review").length || 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Exposed
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Cadastro e gerenciamento de usuários suspeitos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Novo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-card border-border/50">
            <DialogHeader>
              <DialogTitle className="text-base">{editingId ? "Editar Registro" : "Novo Registro"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Nome/ID *</Label>
                <Input value={nameId} onChange={(e) => setNameId(e.target.value)} placeholder="Nome ou ID do usuário" className="bg-background/50 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Discord</Label>
                <Input value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="username#0000" className="bg-background/50 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Foto (URL)</Label>
                <Input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://..." className="bg-background/50 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes sobre o usuário..." className="bg-background/50 min-h-[70px] text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Status</Label>
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v as any)}>
                  <SelectTrigger className="bg-background/50 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="banned">Banido</SelectItem>
                    <SelectItem value="under_review">Em Revisão</SelectItem>
                    <SelectItem value="cleared">Limpo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
              <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingId ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card/60 border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total</p>
              <p className="text-xl font-bold">{totalCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Ban className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Banidos</p>
              <p className="text-xl font-bold text-red-400">{bannedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Em Revisão</p>
              <p className="text-xl font-bold text-yellow-400">{reviewCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, discord..." className="pl-9 bg-card/60 border-border/40 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9 bg-card/60 border-border/40 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="banned">Banido</SelectItem>
            <SelectItem value="under_review">Em Revisão</SelectItem>
            <SelectItem value="cleared">Limpo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {!exposedList || exposedList.length === 0 ? (
        <Card className="bg-card/60 border-border/40">
          <CardContent className="py-16">
            <div className="text-center text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
                <UserX className="w-7 h-7 text-primary/30" />
              </div>
              <p className="text-sm font-medium">Nenhum registro encontrado</p>
              <p className="text-xs mt-1.5 text-muted-foreground/60">Clique em "Novo Registro" para adicionar</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {exposedList.map((item, idx) => {
            const statusConfig = getStatusConfig(item.status);
            const StatusIcon = statusConfig.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card className="bg-card/60 border-border/40 card-hover group overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 overflow-hidden border border-border/30">
                        {item.photo ? (
                          <img src={item.photo} alt={item.nameId} className="w-full h-full object-cover" />
                        ) : (
                          <UserX className="w-4.5 h-4.5 text-primary/50" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{item.nameId}</h3>
                          <Badge className={`text-[9px] font-semibold ${statusConfig.className}`}>
                            <StatusIcon className="w-2.5 h-2.5 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        {item.discord && (
                          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {item.discord}
                          </p>
                        )}
                        {item.description && (
                          <p className="text-[11px] text-muted-foreground/70 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                        )}
                        <p className="text-[9px] text-muted-foreground/40 mt-2 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(item.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(item)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm("Remover este registro?")) deleteMutation.mutate({ id: item.id }); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
