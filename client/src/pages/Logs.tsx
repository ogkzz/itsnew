import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/hooks/useSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, Info, AlertTriangle, XCircle, RefreshCw, Terminal,
  Filter, Clock, Wifi, WifiOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useLocalAuth } from "@/contexts/AuthContext";

function getLevelConfig(level: string) {
  switch (level) {
    case "info": return { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/15", label: "INFO" };
    case "warn": return { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/15", label: "WARN" };
    case "error": return { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/15", label: "ERROR" };
    default: return { icon: Info, color: "text-muted-foreground", bg: "", label: level.toUpperCase() };
  }
}

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    access: "text-green-400",
    analysis: "text-purple-400",
    security: "text-red-400",
    system: "text-blue-400",
  };
  return colors[type] || "text-muted-foreground";
}

export default function Logs() {
  const { username } = useLocalAuth();
  const [typeFilter, setTypeFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");

  const { data: logsList, refetch } = trpc.logs.list.useQuery({
    username: username || "free",
    limit: 100, offset: 0,
    type: typeFilter !== "all" ? typeFilter : undefined,
    level: levelFilter !== "all" ? levelFilter : undefined,
  });

  const { subscribe, on, connected } = useSocket();

  useEffect(() => {
    subscribe("logs");
    const unsub = on("log:new", () => refetch());
    return unsub;
  }, [subscribe, on, refetch]);

  const infoCount = logsList?.filter(l => l.level === "info").length || 0;
  const warnCount = logsList?.filter(l => l.level === "warn").length || 0;
  const errorCount = logsList?.filter(l => l.level === "error").length || 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Terminal className="w-6 h-6 text-primary" />
            Logs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Registros de atividade do sistema em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 border border-border/40">
            {connected ? <Wifi className="w-3.5 h-3.5 text-green-400" /> : <WifiOff className="w-3.5 h-3.5 text-red-400" />}
            <span className="text-xs text-muted-foreground">{connected ? "Live" : "Offline"}</span>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/40">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Info className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Info</p>
            <p className="text-lg font-bold text-blue-400">{infoCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/40">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Warnings</p>
            <p className="text-lg font-bold text-yellow-400">{warnCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/40">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Errors</p>
            <p className="text-lg font-bold text-red-400">{errorCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 h-8 bg-card/60 border-border/40 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="access">Acesso</SelectItem>
            <SelectItem value="analysis">Análise</SelectItem>
            <SelectItem value="security">Segurança</SelectItem>
            <SelectItem value="system">Sistema</SelectItem>
          </SelectContent>
        </Select>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-36 h-8 bg-card/60 border-border/40 text-xs"><SelectValue placeholder="Nível" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os níveis</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[10px] text-muted-foreground/50 ml-auto">{logsList?.length || 0} registros</span>
      </div>

      {/* Logs - Terminal Style */}
      <Card className="bg-card/60 border-border/40 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-background/40 border-b border-border/30">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-[10px] text-muted-foreground/50 font-mono ml-2">itsnew://logs</span>
        </div>
        <CardContent className="p-0">
          {!logsList || logsList.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-primary/30" />
              </div>
              <p className="text-sm font-medium">Nenhum log encontrado</p>
              <p className="text-xs mt-1.5 text-muted-foreground/60">Os logs aparecerão conforme o sistema for utilizado</p>
            </div>
          ) : (
            <div className="divide-y divide-border/10 max-h-[600px] overflow-y-auto">
              {logsList.map((log, idx) => {
                const levelConfig = getLevelConfig(log.level);
                const LevelIcon = levelConfig.icon;
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.01 }}
                    className="px-4 py-2.5 hover:bg-primary/3 transition-colors group font-mono"
                  >
                    <div className="flex items-start gap-3">
                      {/* Timestamp */}
                      <span className="text-[10px] text-muted-foreground/40 tabular-nums shrink-0 mt-0.5 hidden sm:block">
                        {new Date(log.createdAt).toLocaleString("pt-BR", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>

                      {/* Level */}
                      <Badge className={`${levelConfig.bg} text-[8px] font-bold shrink-0 px-1.5 py-0 h-4 ${levelConfig.color}`}>
                        {levelConfig.label}
                      </Badge>

                      {/* Type */}
                      <span className={`text-[10px] font-semibold uppercase shrink-0 ${getTypeColor(log.type)}`}>
                        [{log.type}]
                      </span>

                      {/* Message */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-foreground/80 leading-relaxed">{log.message}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {log.sourceIp && (
                            <span className="text-[9px] text-muted-foreground/40">{log.sourceIp}</span>
                          )}
                          <span className="text-[9px] text-muted-foreground/30 sm:hidden">
                            {new Date(log.createdAt).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
