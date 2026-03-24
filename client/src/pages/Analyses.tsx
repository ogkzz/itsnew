import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Play, Loader2, Shield, ShieldAlert, ShieldX, ChevronRight,
  Crosshair, Fingerprint, Globe, Cpu, AlertTriangle, CheckCircle2, XCircle, Minus, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useLocalAuth } from "@/contexts/AuthContext";

function getStatusBadge(status: string) {
  switch (status) {
    case "safe": return <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px] font-semibold">Seguro</Badge>;
    case "suspicious": return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[10px] font-semibold">Suspeito</Badge>;
    case "confirmed": return <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] font-semibold">Confirmado</Badge>;
    default: return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}

function getScoreColor(score: number) {
  if (score <= 30) return "text-green-400";
  if (score <= 70) return "text-yellow-400";
  return "text-red-400";
}

function getScoreBarColor(score: number) {
  if (score <= 30) return "#22c55e";
  if (score <= 70) return "#eab308";
  return "#ef4444";
}

function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreBarColor(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth={6} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={6}
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
}

function AdvancedCheckItem({ name, status, details }: { name: string; status: string; details: string }) {
  const icon = status === "pass" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> :
    status === "warn" ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" /> :
    <XCircle className="w-3.5 h-3.5 text-red-400" />;
  const bgColor = status === "pass" ? "bg-green-500/5 border-green-500/15" :
    status === "warn" ? "bg-yellow-500/5 border-yellow-500/15" :
    "bg-red-500/5 border-red-500/15";

  return (
    <div className={`p-3 rounded-lg border ${bgColor} transition-all`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-semibold">{name}</span>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">{details}</p>
    </div>
  );
}

export default function Analyses() {
  const { username } = useLocalAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [ip, setIp] = useState("");
  const [domain, setDomain] = useState("");
  const [userAgent, setUserAgent] = useState("");
  const [timezone, setTimezone] = useState("");
  const [language, setLanguage] = useState("");
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  const { data: analysesList, refetch } = trpc.analysis.list.useQuery({
    username: username || "free", limit: 50, offset: 0,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const runAnalysis = trpc.analysis.run.useMutation({
    onSuccess: (data) => {
      setAnalysisResult(data);
      setAnalysisStep(3);
      setShowResult(true);
      refetch();
      toast.success("Análise concluída com sucesso!");
    },
    onError: (err) => {
      toast.error("Erro na análise: " + err.message);
      setAnalysisStep(0);
    },
  });

  const handleRunAnalysis = async () => {
    if (!ip.trim()) {
      toast.error("Informe um IP para análise");
      return;
    }
    setShowResult(false);
    setAnalysisResult(null);
    setAnalysisStep(1);
    setTimeout(() => setAnalysisStep(2), 1000);
    setTimeout(() => {
      runAnalysis.mutate({
        ip: ip.trim(),
        username: username || "free",
        domain: domain.trim() || undefined,
        userAgent: userAgent.trim() || navigator.userAgent,
        headers: {},
      });
    }, 2000);
  };

  const steps = [
    { label: "Coleta de Dados", desc: "IP, headers, conexão, fingerprint", icon: Crosshair },
    { label: "Verificação", desc: "10 métodos de detecção", icon: Cpu },
    { label: "Resultado", desc: "Score e classificação", icon: Shield },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Crosshair className="w-6 h-6 text-primary" />
          Análises
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Execute análises avançadas de detecção com 10 métodos integrados</p>
      </div>

      {/* New Analysis Card */}
      <Card className="bg-card/60 border-border/40 gradient-border overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Nova Análise
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">IP *</Label>
              <Input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="Ex: 185.220.101.42" className="bg-background/50 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Domínio</Label>
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="Ex: freefire-hack.xyz" className="bg-background/50 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">User-Agent</Label>
              <Input value={userAgent} onChange={(e) => setUserAgent(e.target.value)} placeholder="Automático se vazio" className="bg-background/50 h-9 text-sm" />
            </div>
          </div>

          {/* Analysis Steps Progress */}
          <AnimatePresence>
            {analysisStep > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <div className="flex items-center gap-1 p-3 rounded-xl bg-background/40">
                  {steps.map((step, i) => {
                    const StepIcon = step.icon;
                    const isActive = analysisStep === i + 1;
                    const isDone = analysisStep > i + 1;
                    return (
                      <div key={i} className="flex items-center gap-2 flex-1">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-500 shrink-0 ${
                          isDone ? "bg-green-500/15 text-green-400" :
                          isActive ? "bg-primary/15 text-primary" :
                          "bg-muted/50 text-muted-foreground/50"
                        }`}>
                          {isDone ? <CheckCircle2 className="w-4 h-4" /> :
                            isActive ? <Loader2 className="w-4 h-4 animate-spin" /> :
                            <StepIcon className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0 hidden sm:block">
                          <p className={`text-[11px] font-semibold truncate ${isActive ? "text-primary" : isDone ? "text-green-400" : "text-muted-foreground/50"}`}>{step.label}</p>
                          <p className="text-[9px] text-muted-foreground/50 truncate">{step.desc}</p>
                        </div>
                        {i < steps.length - 1 && (
                          <div className={`w-6 h-px shrink-0 ${isDone ? "bg-green-500/30" : "bg-border/30"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button onClick={handleRunAnalysis} disabled={runAnalysis.isPending || (analysisStep > 0 && analysisStep < 3)} size="sm">
            {runAnalysis.isPending || (analysisStep > 0 && analysisStep < 3) ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {analysisStep > 0 && analysisStep < 3 ? "Analisando..." : "Executar Análise"}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Result */}
      <AnimatePresence>
        {analysisResult && showResult && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="bg-card/60 border-border/40 overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Resultado da Análise</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setShowResult(false); setAnalysisStep(0); }}>
                    Fechar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <Tabs defaultValue="overview" className="space-y-4">
                  <TabsList className="bg-background/50 h-8">
                    <TabsTrigger value="overview" className="text-xs h-6">Visão Geral</TabsTrigger>
                    <TabsTrigger value="detections" className="text-xs h-6">Detecções ({analysisResult.detections?.length || 0})</TabsTrigger>
                    <TabsTrigger value="advanced" className="text-xs h-6">Checks Avançados</TabsTrigger>
                    <TabsTrigger value="info" className="text-xs h-6">Info</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col items-center justify-center p-5 rounded-xl bg-background/30">
                        <ScoreGauge score={analysisResult.totalScore} size={140} />
                        <div className="mt-3">{getStatusBadge(analysisResult.status)}</div>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          {analysisResult.status === "safe" ? "Nenhuma ameaça significativa detectada" :
                           analysisResult.status === "suspicious" ? "Comportamento suspeito identificado" :
                           "Ameaça confirmada - Ação recomendada"}
                        </p>
                      </div>
                      <div className="space-y-2.5">
                        {[
                          { label: "Proxy/VPN", score: analysisResult.proxyVpnScore, icon: Globe },
                          { label: "Domínio", score: analysisResult.domainScore, icon: Globe },
                          { label: "Fingerprint", score: analysisResult.fingerprintScore, icon: Fingerprint },
                          { label: "Jailbreak", score: analysisResult.jailbreakScore, icon: Cpu },
                          { label: "Manipulação", score: analysisResult.manipulationScore, icon: AlertTriangle },
                        ].map((item) => (
                          <div key={item.label} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <item.icon className="w-3 h-3" />
                                {item.label}
                              </span>
                              <span className={`font-bold tabular-nums ${getScoreColor(item.score)}`}>{item.score}/100</span>
                            </div>
                            <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${item.score}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: getScoreBarColor(item.score) }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="detections">
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {(!analysisResult.detections || analysisResult.detections.length === 0) ? (
                        <div className="text-center py-10 text-muted-foreground">
                          <Shield className="w-8 h-8 mx-auto mb-2 text-green-400/50" />
                          <p className="text-sm">Nenhuma detecção encontrada</p>
                        </div>
                      ) : (
                        analysisResult.detections.map((det: any, i: number) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="p-3 rounded-lg bg-background/30 border border-border/20"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] font-mono">{det.type}</Badge>
                                <span className="text-[10px] text-muted-foreground/60 font-mono">{det.method}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold tabular-nums ${getScoreColor(det.score)}`}>+{det.score}</span>
                                <Badge className={`text-[9px] ${
                                  det.severity === "high" ? "bg-red-500/10 text-red-400 border-red-500/15" :
                                  det.severity === "medium" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/15" :
                                  "bg-blue-500/10 text-blue-400 border-blue-500/15"
                                }`}>{det.severity}</Badge>
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground">{det.description}</p>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="advanced">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {analysisResult.advancedChecks?.map((check: any, i: number) => (
                        <AdvancedCheckItem key={i} name={check.name} status={check.status} details={check.details} />
                      )) || (
                        <p className="text-sm text-muted-foreground col-span-2 text-center py-8">Checks avançados não disponíveis</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="info">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {analysisResult.asnInfo && (
                        <div className="p-3 rounded-lg bg-background/30 border border-border/20 space-y-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">ASN Info</p>
                          <p className="text-xs"><span className="text-muted-foreground">ASN:</span> {analysisResult.asnInfo.asn}</p>
                          <p className="text-xs"><span className="text-muted-foreground">Org:</span> {analysisResult.asnInfo.org}</p>
                          <p className="text-xs"><span className="text-muted-foreground">Datacenter:</span> {analysisResult.asnInfo.isDatacenter ? "Sim" : "Não"}</p>
                        </div>
                      )}
                      {analysisResult.geoInfo && (
                        <div className="p-3 rounded-lg bg-background/30 border border-border/20 space-y-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Geolocalização</p>
                          <p className="text-xs"><span className="text-muted-foreground">País:</span> {analysisResult.geoInfo.country}</p>
                          <p className="text-xs"><span className="text-muted-foreground">Cidade:</span> {analysisResult.geoInfo.city}</p>
                          <p className="text-xs"><span className="text-muted-foreground">Timezone:</span> {analysisResult.geoInfo.timezone}</p>
                        </div>
                      )}
                      <div className="p-3 rounded-lg bg-background/30 border border-border/20 space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Fingerprint</p>
                        <p className="text-xs font-mono break-all text-muted-foreground">{analysisResult.fingerprintId}</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis History */}
      <Card className="bg-card/60 border-border/40">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              Histórico
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 bg-background/50 text-xs">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="safe">Seguro</SelectItem>
                <SelectItem value="suspicious">Suspeito</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {!analysesList || analysesList.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-primary/30" />
              </div>
              <p className="text-sm font-medium">Nenhuma análise encontrada</p>
              <p className="text-xs mt-1 text-muted-foreground/60">Execute uma análise acima para começar</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    {["ID", "IP", "Score", "P/V", "Dom", "FP", "JB", "Man", "Status", "Data"].map(h => (
                      <th key={h} className="text-left py-2.5 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysesList.map((a, idx) => (
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-border/15 hover:bg-primary/3 transition-colors"
                    >
                      <td className="py-2 px-2 text-[11px] text-muted-foreground/60">#{a.id}</td>
                      <td className="py-2 px-2 font-mono text-[11px]">{a.sourceIp}</td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-1 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${a.totalScore}%`, backgroundColor: getScoreBarColor(a.totalScore) }} />
                          </div>
                          <span className={`font-bold text-[11px] tabular-nums ${getScoreColor(a.totalScore)}`}>{a.totalScore}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-muted-foreground tabular-nums">{a.proxyVpnScore}</td>
                      <td className="py-2 px-2 text-[11px] text-muted-foreground tabular-nums">{a.domainScore}</td>
                      <td className="py-2 px-2 text-[11px] text-muted-foreground tabular-nums">{a.fingerprintScore}</td>
                      <td className="py-2 px-2 text-[11px] text-muted-foreground tabular-nums">{a.jailbreakScore}</td>
                      <td className="py-2 px-2 text-[11px] text-muted-foreground tabular-nums">{a.manipulationScore}</td>
                      <td className="py-2 px-2">{getStatusBadge(a.status)}</td>
                      <td className="py-2 px-2 text-[10px] text-muted-foreground/50 tabular-nums">{new Date(a.createdAt).toLocaleString("pt-BR")}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
