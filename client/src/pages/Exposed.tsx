import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, UserX, Edit, Trash2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Exposed() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [nameId, setNameId] = useState("");
  const [discord, setDiscord] = useState("");
  const [photo, setPhoto] = useState("");
  const [description, setDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "banned" | "under_review" | "cleared">("active");

  const { data: exposedList, refetch } = trpc.exposed.list.useQuery({
    limit: 50,
    offset: 0,
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const createMutation = trpc.exposed.create.useMutation({
    onSuccess: () => {
      toast.success("Registro criado com sucesso!");
      resetForm();
      setDialogOpen(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.exposed.update.useMutation({
    onSuccess: () => {
      toast.success("Registro atualizado!");
      resetForm();
      setDialogOpen(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.exposed.delete.useMutation({
    onSuccess: () => {
      toast.success("Registro removido!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setNameId("");
    setDiscord("");
    setPhoto("");
    setDescription("");
    setFormStatus("active");
    setEditingId(null);
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
    if (!nameId.trim()) {
      toast.error("Nome/ID é obrigatório");
      return;
    }
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        nameId: nameId.trim(),
        discord: discord.trim() || undefined,
        photo: photo.trim() || undefined,
        description: description.trim() || undefined,
        status: formStatus,
      });
    } else {
      createMutation.mutate({
        nameId: nameId.trim(),
        discord: discord.trim() || undefined,
        photo: photo.trim() || undefined,
        description: description.trim() || undefined,
        status: formStatus,
      });
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "active": return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30">Ativo</Badge>;
      case "banned": return <Badge className="bg-red-500/15 text-red-400 border-red-500/30">Banido</Badge>;
      case "under_review": return <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30">Em Revisão</Badge>;
      case "cleared": return <Badge className="bg-green-500/15 text-green-400 border-green-500/30">Limpo</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exposed</h1>
          <p className="text-muted-foreground text-sm mt-1">Cadastro e gerenciamento de usuários suspeitos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Registro" : "Novo Registro"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome/ID *</Label>
                <Input value={nameId} onChange={(e) => setNameId(e.target.value)} placeholder="Nome ou ID do usuário" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Discord</Label>
                <Input value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="username#0000" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Foto (URL)</Label>
                <Input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://..." className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes sobre o usuário..." className="bg-background/50 min-h-[80px]" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v as any)}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
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
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingId ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, discord..."
            className="pl-9 bg-background/50 h-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-10 bg-background/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
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
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          {!exposedList || exposedList.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <UserX className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum registro encontrado</p>
              <p className="text-xs mt-1">Clique em "Novo Registro" para adicionar</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {exposedList.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 hover:bg-accent/20 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {item.photo ? (
                        <img src={item.photo} alt={item.nameId} className="w-full h-full object-cover" />
                      ) : (
                        <UserX className="w-5 h-5 text-primary" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{item.nameId}</h3>
                        {getStatusBadge(item.status)}
                      </div>
                      {item.discord && (
                        <p className="text-xs text-muted-foreground mt-1">Discord: {item.discord}</p>
                      )}
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-2">
                        Criado: {new Date(item.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(item)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Tem certeza que deseja remover este registro?")) {
                            deleteMutation.mutate({ id: item.id });
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
