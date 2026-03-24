import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings as SettingsIcon, Globe, Shield, Plus, Trash2, Loader2, Key, Info,
  Zap, Lock, Code, Copy, CheckCircle2, ExternalLink
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

function getTypeBadge(type: string) {
  switch (type) {
    case "keyword": return <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/15 text-[9px] font-semibold">Keyword</Badge>;
    case "extension": return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/15 text-[9px] font-semibold">Extensão</Badge>;
    case "manual": return <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/15 text-[9px] font-semibold">Manual</Badge>;
    default: return <Badge variant="outline" className="text-[9px]">{type}</Badge>;
  }
}

export default function Settings() {
  const [newDomain, setNewDomain] = useState("");
  const [newDomainReason, setNewDomainReason] = useState("");
  const [newDomainType, setNewDomainType] = useState<"keyword" | "extension" | "manual">("manual");
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

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
    onSuccess: () => { toast.success("Domínio removido!"); refetchDomains(); },
  });

  function handleAddDomain() {
    if (!newDomain.trim()) { toast.error("Informe o domínio"); return; }
    addDomain.mutate({ domain: newDomain.trim(), reason: newDomainReason.trim() || undefined, type: newDomainType });
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(id);
    toast.success("Copiado!");
    setTimeout(() => setCopiedEndpoint(null), 2000);
  }

  const detectionMethods = [
    { name: "ASN Analysis", desc: "Identifica IPs de datacenters e provedores de VPN/Proxy", active: true },
    { name: "IP Reputation", desc: "Verifica reputação do IP em bases de dados", active: true },
    { name: "Latency Analysis", desc: "Detecta inconsistências de latência indicativas de proxy", active: true },
    { name: "Geo Consistency", desc: "Verifica consistência entre localização IP e timezone", active: true },
    { name: "TLS Fingerprint (JA3)", desc: "Analisa fingerprint TLS para detectar ferramentas automatizadas", active: true },
    { name: "HTTP Headers", desc: "Detecta headers de proxy (X-Forwarded-For, Via, etc.)", active: true },
    { name: "WebRTC Leak", desc: "Detecta vazamento de IP real via WebRTC", active: true },
    { name: "DNS Leak", desc: "Verifica inconsistências de resolução DNS", active: true },
    { name: "Timezone Mismatch", desc: "Compara timezone do IP com timezone reportado pelo dispositivo", active: true },
    { name: "Device Fingerprint", desc: "Fingerprint único baseado em IP + Headers + User-Agent", active: true },
    { name: "Jailbreak Detection", desc: "Indicadores indiretos de jailbreak via comportamento", active: true },
    { name: "HMAC Signature", desc: "Verificação de assinatura HMAC nas requisições", active: true },
    { name: "Integrity Check", desc: "Verificação de integridade dos dados enviados", active: true },
    { name: "Replay Detection", desc: "Detecta requisições duplicadas/replay attacks", active: true },
    { name: "Impossible Travel", desc: "Heurística de uso impossível (mudanças rápidas de localização)", active: true },
    { name: "Connection Pattern", desc: "Análise de padrões de conexão anormais", active: true },
  ];

  const endpoints = [
    { method: "POST", path: "/api/analyze", desc: "Executar análise completa de IP/dispositivo", color: "bg-green-500/10 text-green-400 border-green-500/15" },
    { method: "GET", path: "/api/status", desc: "Status do sistema e estatísticas gerais", color: "bg-blue-500/10 text-blue-400 border-blue-500/15" },
    { method: "GET", path: "/api/logs", desc: "Listar logs (query: limit, offset, type, level)", color: "bg-blue-500/10 text-blue-400 border-blue-500/15" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" />
          Configurações
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie blacklist, detecção e integração API</p>
      </div>

      <Tabs defaultValue="blacklist" className="space-y-5">
        <TabsList className="bg-card/60 border border-border/40 h-9">
          <TabsTrigger value="blacklist" className="gap-1.5 text-xs h-7"><Globe className="w-3 h-3" />Blacklist</TabsTrigger>
          <TabsTrigger value="detection" className="gap-1.5 text-xs h-7"><Shield className="w-3 h-3" />Detecção</TabsTrigger>
          <TabsTrigger value="api" className="gap-1.5 text-xs h-7"><Key className="w-3 h-3" />API</TabsTrigger>
          <TabsTrigger value="about" className="gap-1.5 text-xs h-7"><Info className="w-3 h-3" />Sobre</TabsTrigger>
        </TabsList>

        {/* Blacklist Tab */}
        <TabsContent value="blacklist" className="space-y-4">
          <Card className="bg-card/60 border-border/40 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-semibold">Adicionar à Blacklist</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="dominio.xyz" className="bg-background/50 h-9 text-sm" />
                <Input value={newDomainReason} onChange={(e) => setNewDomainReason(e.target.value)} placeholder="Motivo (opcional)" className="bg-background/50 h-9 text-sm" />
                <Select value={newDomainType} onValueChange={(v) => setNewDomainType(v as any)}>
                  <SelectTrigger className="bg-background/50 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="keyword">Palavra-chave</SelectItem>
                    <SelectItem value="extension">Extensão</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleAddDomain} disabled={addDomain.isPending} size="sm" className="h-9">
                  {addDomain.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border/40">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-semibold">Blacklist ({domainsList?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {!domainsList || domainsList.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-3">
                    <Globe className="w-5 h-5 text-primary/30" />
                  </div>
                  <p className="text-sm">Nenhum domínio na blacklist</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                  {domainsList.map((d, idx) => (
                    <motion.div
                      key={d.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-background/20 hover:bg-background/40 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-xs text-foreground/80">{d.domain}</span>
                        {getTypeBadge(d.type)}
                        {d.reason && <span className="text-[10px] text-muted-foreground/50 truncate">{d.reason}</span>}
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteDomain.mutate({ id: d.id })}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detection Tab */}
        <TabsContent value="detection" className="space-y-4">
          {/* Score Ranges */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Seguro", range: "0 - 30", color: "text-green-400", bg: "bg-green-500/5 border-green-500/15", desc: "Sem ameaça" },
              { label: "Suspeito", range: "31 - 70", color: "text-yellow-400", bg: "bg-yellow-500/5 border-yellow-500/15", desc: "Risco moderado" },
              { label: "Confirmado", range: "71 - 100", color: "text-red-400", bg: "bg-red-500/5 border-red-500/15", desc: "Ameaça real" },
            ].map(s => (
              <Card key={s.label} className={`${s.bg} border`}>
                <CardContent className="p-4 text-center">
                  <p className={`text-xs font-semibold ${s.color}`}>{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.range}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Keywords & Extensions */}
          <Card className="bg-card/60 border-border/40">
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">Palavras-chave Monitoradas</p>
                <div className="flex flex-wrap gap-1.5">
                  {["freefire", "proxy", "vpn", "bypass", "inject", "hack", "cheat", "mod", "spoof"].map(kw => (
                    <Badge key={kw} variant="outline" className="font-mono text-[10px] bg-purple-500/5 border-purple-500/15 text-purple-400">{kw}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">Extensões Monitoradas</p>
                <div className="flex flex-wrap gap-1.5">
                  {[".xyz", ".click", ".top", ".site", ".online", ".tk", ".ml", ".ga", ".cf"].map(ext => (
                    <Badge key={ext} variant="outline" className="font-mono text-[10px] bg-blue-500/5 border-blue-500/15 text-blue-400">{ext}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detection Methods */}
          <Card className="bg-card/60 border-border/40">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                {detectionMethods.length} Métodos de Detecção
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {detectionMethods.map((m, idx) => (
                  <motion.div
                    key={m.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/20 hover:bg-background/30 transition-colors"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-[11px] font-semibold">{m.name}</p>
                      <p className="text-[9px] text-muted-foreground/60 leading-relaxed">{m.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-4">
          <Card className="bg-card/60 border-border/40">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Code className="w-4 h-4 text-primary" />
                Endpoints REST
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 space-y-2">
              {endpoints.map(ep => (
                <div key={ep.path} className="p-3 rounded-lg bg-background/20 border border-border/15 hover:border-border/30 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[9px] font-bold ${ep.color}`}>{ep.method}</Badge>
                      <code className="font-mono text-xs text-foreground/80">{ep.path}</code>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(ep.path, ep.path)}>
                      {copiedEndpoint === ep.path ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">{ep.desc}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border/40 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-background/40 border-b border-border/30">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-[10px] text-muted-foreground/50 font-mono ml-2">Exemplo - POST /api/analyze</span>
            </div>
            <CardContent className="p-0">
              <pre className="text-[11px] font-mono p-4 overflow-x-auto text-foreground/70 leading-relaxed">
{`curl -X POST /api/analyze \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <jwt_token>" \\
  -d '{
    "ip": "185.220.101.42",
    "domain": "freefire-hack.xyz",
    "userAgent": "Mozilla/5.0 ...",
    "headers": {}
  }'`}
              </pre>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border/40 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-background/40 border-b border-border/30">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-[10px] text-muted-foreground/50 font-mono ml-2">Resposta - Análise</span>
            </div>
            <CardContent className="p-0">
              <pre className="text-[11px] font-mono p-4 overflow-x-auto text-foreground/70 leading-relaxed">
{`{
  "totalScore": 78,
  "status": "confirmed",
  "proxyVpnScore": 85,
  "domainScore": 90,
  "fingerprintScore": 45,
  "jailbreakScore": 30,
  "manipulationScore": 60,
  "detections": [...],
  "advancedChecks": [...],
  "fingerprintId": "abc123..."
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* About Tab */}
        <TabsContent value="about" className="space-y-4">
          <Card className="bg-card/60 border-border/40 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4 glow-blue">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  its<span className="text-primary">new</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Anti-Fraud Detection System</p>
                <Badge variant="outline" className="mt-2 text-[10px]">v2.0.0</Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Métodos", value: "16", icon: Zap },
                  { label: "Endpoints", value: "3", icon: Code },
                  { label: "Tempo Real", value: "WS", icon: Lock },
                  { label: "Segurança", value: "JWT", icon: Shield },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-xl bg-background/20 text-center">
                    <s.icon className="w-4 h-4 text-primary mx-auto mb-1.5" />
                    <p className="text-lg font-bold">{s.value}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 text-xs text-muted-foreground/70 leading-relaxed">
                <p>
                  Sistema profissional para análise e detecção de uso suspeito em dispositivos,
                  incluindo detecção avançada de proxy, VPN, jailbreak e manipulação.
                </p>
                <p>
                  Utiliza 16 métodos de detecção integrados com análise em tempo real via WebSocket,
                  API REST com autenticação JWT e rate limiting para integração segura.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
