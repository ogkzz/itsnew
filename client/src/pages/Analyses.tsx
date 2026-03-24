import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Search, Play, Loader2, Shield, ShieldAlert, ShieldX, Eye, ChevronRight, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function Analyses() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [ip, setIp] = useState("");
  const [domain, setDomain] = useState("");
  const [userAgent, setUserAgent] = useState("");
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  const { data: analysesList, refetch } = trpc.analysis.list.useQuery({ limit: 50, offset: 0, status: statusFilter });
  const runAnalysis = trpc.analysis.run.useMutation({
    onSuccess: (data) => {
      setAnalysisResult(data);
      setAnalysisStep(3);
      setShowResult(true);
      refetch();
      toast.success("Análise concluída!");
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
    setAnalysisStep(1);
    setTimeout(() => setAnalysisStep(2), 800);
    setTimeout(() => {
      runAnalysis.mutate({
        ip: ip.trim(),
        domain: domain.trim() || undefined,
        userAgent: userAgent.trim() || navigator.userAgent,
        headers: {},
      });
    }, 1600);
  };

  function getStatusBadge(status: string) {
    switch (status) {
      case "safe": return <Badge className="bg-green-500/15 text-green-400 border-green-500/30">Seguro</Badge>;
      case "suspicious": return <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30">Suspeito</Badge>;
      case "confirmed": return <Badge className="bg-red-500/15 text-red-400 border-red-500/30">Confirmado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getScoreColor(score: number) {
    if (score <= 30) return "text-green-400";
    if (score <= 70) return "text-yellow-400";
    return "text-red-400";
  }

  function getScoreBarColor(score: number) {
    if (score <= 30) return "bg-green-500";
    if (score <= 70) return "bg-yellow-500";
    return "bg-red-500";
  }

  const steps = [
    { label: "Coleta de Dados", desc: "IP, headers, conexão, comportamento" },
    { label: "Verificação", desc: "Aplicando métodos de detecção" },
    { label: "Resultado", desc: "Score de risco gerado" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Análises</h1>
        <p className="text-muted-foreground text-sm mt-1">Execute e visualize análises de detecção</p>
      </div>

      {/* New Analysis Card */}
      <Card className="bg-card/50 border-border/50 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Play className="w-4 h-4 text-primary" />
            Nova Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label className="text-xs">Endereço IP *</Label>
              <Input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="Ex: 192.168.1.100"
                className="bg-background/50 h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Domínio (opcional)</Label>
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Ex: freefire-hack.xyz"
                className="bg-background/50 h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">User-Agent (opcional)</Label>
              <Input
                value={userAgent}
                onChange={(e) => setUserAgent(e.target.value)}
                placeholder="Automático se vazio"
                className="bg-background/50 h-10"
              />
            </div>
          </div>

          {/* Analysis Steps Progress */}
          {analysisStep > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4"
            >
              <div className="flex items-center gap-2 mb-3">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                      analysisStep > i + 1 ? "bg-green-500 text-white" :
                      analysisStep === i + 1 ? "bg-primary text-primary-foreground animate-pulse" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {analysisStep > i + 1 ? "✓" : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{step.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{step.desc}</p>
                    </div>
                    {i < steps.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <Button
            onClick={handleRunAnalysis}
            disabled={runAnalysis.isPending || analysisStep > 0 && analysisStep < 3}
            className="w-full sm:w-auto"
          >
            {runAnalysis.isPending || (analysisStep > 0 && analysisStep < 3) ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {analysisStep > 0 && analysisStep < 3 ? "Analisando..." : "Executar Análise"}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Result Dialog */}
      {analysisResult && showResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Resultado da Análise</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => { setShowResult(false); setAnalysisStep(0); }}>
                  Fechar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Score Overview */}
                <div className="space-y-4">
                  <div className="text-center p-6 rounded-xl bg-background/50">
                    <p className="text-sm text-muted-foreground mb-2">Score Total</p>
                    <p className={`text-5xl font-bold ${getScoreColor(analysisResult.totalScore)}`}>
                      {analysisResult.totalScore}
                    </p>
                    <div className="mt-2">{getStatusBadge(analysisResult.status)}</div>
                  </div>

                  {/* Individual Scores */}
                  <div className="space-y-3">
                    {[
                      { label: "Proxy/VPN", score: analysisResult.proxyVpnScore },
                      { label: "Domínio", score: analysisResult.domainScore },
                      { label: "Fingerprint", score: analysisResult.fingerprintScore },
                      { label: "Jailbreak", score: analysisResult.jailbreakScore },
                      { label: "Manipulação", score: analysisResult.manipulationScore },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className={getScoreColor(item.score)}>{item.score}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.score}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`h-full rounded-full ${getScoreBarColor(item.score)}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detections */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Detecções ({analysisResult.detections?.length || 0})</h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {analysisResult.detections?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Shield className="w-8 h-8 mx-auto mb-2 text-green-400" />
                        <p className="text-sm">Nenhuma detecção encontrada</p>
                      </div>
                    ) : (
                      analysisResult.detections?.map((det: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-background/50 border border-border/30">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className="text-[10px]">{det.type}</Badge>
                            <Badge className={`text-[10px] ${
                              det.severity === "high" ? "bg-red-500/15 text-red-400 border-red-500/30" :
                              det.severity === "medium" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" :
                              "bg-blue-500/15 text-blue-400 border-blue-500/30"
                            }`}>
                              {det.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{det.description}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">Método: {det.method} | Score: +{det.score}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Analysis History */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base font-semibold">Histórico de Análises</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-9 bg-background/50">
                <SelectValue placeholder="Filtrar status" />
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
        <CardContent>
          {!analysesList || analysesList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma análise encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">IP</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">P/V</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Dom</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">FP</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">JB</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Man</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {analysesList.map((a) => (
                    <tr key={a.id} className="border-b border-border/30 hover:bg-accent/30 transition-colors">
                      <td className="py-3 px-3 text-xs text-muted-foreground">#{a.id}</td>
                      <td className="py-3 px-3 font-mono text-xs">{a.sourceIp}</td>
                      <td className="py-3 px-3 font-semibold"><span className={getScoreColor(a.totalScore)}>{a.totalScore}</span></td>
                      <td className="py-3 px-3 text-xs">{a.proxyVpnScore}</td>
                      <td className="py-3 px-3 text-xs">{a.domainScore}</td>
                      <td className="py-3 px-3 text-xs">{a.fingerprintScore}</td>
                      <td className="py-3 px-3 text-xs">{a.jailbreakScore}</td>
                      <td className="py-3 px-3 text-xs">{a.manipulationScore}</td>
                      <td className="py-3 px-3">{getStatusBadge(a.status)}</td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString("pt-BR")}</td>
                    </tr>
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
