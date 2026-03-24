import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Globe, Shield, Plus, Trash2, Loader2, Database, Key, Info } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Settings() {
  const [newDomain, setNewDomain] = useState("");
  const [newDomainReason, setNewDomainReason] = useState("");
  const [newDomainType, setNewDomainType] = useState<"keyword" | "extension" | "manual">("manual");

  const { data: domainsList, refetch: refetchDomains } = trpc.domains.list.useQuery();
  const addDomain = trpc.domains.add.useMutation({
    onSuccess: () => {
      toast.success("Domínio adicionado à blacklist!");
      setNewDomain("");
      setNewDomainReason("");
      refetchDomains();
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteDomain = trpc.domains.delete.useMutation({
    onSuccess: () => {
      toast.success("Domínio removido!");
      refetchDomains();
    },
  });

  function handleAddDomain() {
    if (!newDomain.trim()) {
      toast.error("Informe o domínio");
      return;
    }
    addDomain.mutate({
      domain: newDomain.trim(),
      reason: newDomainReason.trim() || undefined,
      type: newDomainType,
    });
  }

  function getTypeBadge(type: string) {
    switch (type) {
      case "keyword": return <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-[10px]">Palavra-chave</Badge>;
      case "extension": return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px]">Extensão</Badge>;
      case "manual": return <Badge className="bg-gray-500/15 text-gray-400 border-gray-500/30 text-[10px]">Manual</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{type}</Badge>;
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie as configurações do sistema</p>
      </div>

      <Tabs defaultValue="blacklist" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="blacklist" className="gap-2">
            <Globe className="w-3.5 h-3.5" />
            Blacklist
          </TabsTrigger>
          <TabsTrigger value="detection" className="gap-2">
            <Shield className="w-3.5 h-3.5" />
            Detecção
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Key className="w-3.5 h-3.5" />
            API
          </TabsTrigger>
          <TabsTrigger value="about" className="gap-2">
            <Info className="w-3.5 h-3.5" />
            Sobre
          </TabsTrigger>
        </TabsList>

        {/* Blacklist Tab */}
        <TabsContent value="blacklist" className="space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Adicionar Domínio</CardTitle>
              <CardDescription>Adicione domínios à blacklist para detecção automática</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-1">
                  <Input
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="dominio.xyz"
                    className="bg-background/50 h-10"
                  />
                </div>
                <div className="md:col-span-1">
                  <Input
                    value={newDomainReason}
                    onChange={(e) => setNewDomainReason(e.target.value)}
                    placeholder="Motivo (opcional)"
                    className="bg-background/50 h-10"
                  />
                </div>
                <div>
                  <Select value={newDomainType} onValueChange={(v) => setNewDomainType(v as any)}>
                    <SelectTrigger className="bg-background/50 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="keyword">Palavra-chave</SelectItem>
                      <SelectItem value="extension">Extensão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Button onClick={handleAddDomain} disabled={addDomain.isPending} className="w-full h-10">
                    {addDomain.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Adicionar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Domínios na Blacklist ({domainsList?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {!domainsList || domainsList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum domínio na blacklist</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {domainsList.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-background/30 hover:bg-background/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">{d.domain}</span>
                        {getTypeBadge(d.type)}
                        {d.reason && <span className="text-xs text-muted-foreground">- {d.reason}</span>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteDomain.mutate({ id: d.id })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detection Tab */}
        <TabsContent value="detection" className="space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Configurações de Detecção</CardTitle>
              <CardDescription>Parâmetros do sistema de análise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-xl bg-background/30 space-y-2">
                  <h4 className="text-sm font-semibold text-green-400">Seguro</h4>
                  <p className="text-3xl font-bold">0 - 30</p>
                  <p className="text-xs text-muted-foreground">Nenhuma ameaça detectada</p>
                </div>
                <div className="p-4 rounded-xl bg-background/30 space-y-2">
                  <h4 className="text-sm font-semibold text-yellow-400">Suspeito</h4>
                  <p className="text-3xl font-bold">31 - 70</p>
                  <p className="text-xs text-muted-foreground">Indicadores de risco encontrados</p>
                </div>
                <div className="p-4 rounded-xl bg-background/30 space-y-2">
                  <h4 className="text-sm font-semibold text-red-400">Confirmado</h4>
                  <p className="text-3xl font-bold">71 - 100</p>
                  <p className="text-xs text-muted-foreground">Ameaça confirmada</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Palavras-chave Monitoradas</h4>
                <div className="flex flex-wrap gap-2">
                  {["freefire", "proxy", "vpn", "bypass", "inject"].map((kw) => (
                    <Badge key={kw} variant="outline" className="font-mono text-xs">{kw}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Extensões Monitoradas</h4>
                <div className="flex flex-wrap gap-2">
                  {[".xyz", ".click", ".top", ".site", ".online"].map((ext) => (
                    <Badge key={ext} variant="outline" className="font-mono text-xs">{ext}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Métodos de Detecção Ativos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "Análise de IP (ASN, Datacenter)",
                    "Reputação de IP",
                    "Latência e Inconsistência de Localização",
                    "TLS Fingerprint (JA3)",
                    "Headers HTTP",
                    "Fingerprint Único (IP + Headers + UA)",
                    "Detecção de Jailbreak (Indireto)",
                    "Assinatura HMAC",
                    "Verificação de Integridade",
                    "Detecção de Replay",
                    "Heurística de Uso Impossível",
                  ].map((method) => (
                    <div key={method} className="flex items-center gap-2 p-2 rounded-lg bg-background/20">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs">{method}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base">API REST</CardTitle>
              <CardDescription>Endpoints disponíveis para integração</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { method: "POST", path: "/api/analyze", desc: "Executar análise de IP/dispositivo" },
                { method: "GET", path: "/api/status", desc: "Verificar status do sistema e estatísticas" },
                { method: "GET", path: "/api/logs", desc: "Listar logs do sistema (query: limit, offset)" },
              ].map((endpoint) => (
                <div key={endpoint.path} className="p-4 rounded-xl bg-background/30 border border-border/30">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={`text-xs ${
                      endpoint.method === "POST" ? "bg-green-500/15 text-green-400 border-green-500/30" :
                      "bg-blue-500/15 text-blue-400 border-blue-500/30"
                    }`}>
                      {endpoint.method}
                    </Badge>
                    <code className="font-mono text-sm">{endpoint.path}</code>
                  </div>
                  <p className="text-xs text-muted-foreground">{endpoint.desc}</p>
                </div>
              ))}

              <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <h4 className="text-sm font-semibold mb-2">Exemplo de uso - /api/analyze</h4>
                <pre className="text-xs font-mono bg-background/50 p-3 rounded-lg overflow-x-auto">
{`curl -X POST /api/analyze \\
  -H "Content-Type: application/json" \\
  -d '{
    "ip": "192.168.1.100",
    "domain": "freefire-hack.xyz",
    "userAgent": "Mozilla/5.0 ..."
  }'`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* About Tab */}
        <TabsContent value="about" className="space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Sobre o Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-6 rounded-xl bg-background/30 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 glow-blue">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold">itsnew</h2>
                <p className="text-sm text-muted-foreground mt-1">Sistema de Análise e Detecção de Uso Suspeito</p>
                <p className="text-xs text-muted-foreground mt-3">Versão 1.0.0</p>
              </div>

              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Sistema profissional para análise e detecção de uso suspeito em dispositivos iPhone,
                  incluindo detecção de proxy, VPN, jailbreak e manipulação no Free Fire.
                </p>
                <p className="text-muted-foreground">
                  Funciona com um cliente/app que envia dados para análise, sem acessar diretamente
                  o sistema do dispositivo.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
