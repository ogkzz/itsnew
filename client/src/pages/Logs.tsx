import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/hooks/useSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Info, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Logs() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");

  const { data: logsList, refetch } = trpc.logs.list.useQuery({
    limit: 100,
    offset: 0,
    type: typeFilter !== "all" ? typeFilter : undefined,
    level: levelFilter !== "all" ? levelFilter : undefined,
  });

  const { subscribe, on } = useSocket();

  useEffect(() => {
    subscribe("logs");
    const unsub = on("log:new", () => refetch());
    return unsub;
  }, [subscribe, on, refetch]);

  function getLevelIcon(level: string) {
    switch (level) {
      case "info": return <Info className="w-3.5 h-3.5 text-blue-400" />;
      case "warn": return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
      case "error": return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      default: return <Info className="w-3.5 h-3.5" />;
    }
  }

  function getLevelBadge(level: string) {
    switch (level) {
      case "info": return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px]">INFO</Badge>;
      case "warn": return <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-[10px]">WARN</Badge>;
      case "error": return <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">ERROR</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{level}</Badge>;
    }
  }

  function getTypeBadge(type: string) {
    const colors: Record<string, string> = {
      access: "bg-green-500/15 text-green-400 border-green-500/30",
      analysis: "bg-purple-500/15 text-purple-400 border-purple-500/30",
      security: "bg-red-500/15 text-red-400 border-red-500/30",
      system: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    };
    return <Badge className={`${colors[type] || ""} text-[10px]`}>{type.toUpperCase()}</Badge>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">Registros de atividade do sistema</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 h-10 bg-background/50">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="access">Acesso</SelectItem>
            <SelectItem value="analysis">Análise</SelectItem>
            <SelectItem value="security">Segurança</SelectItem>
            <SelectItem value="system">Sistema</SelectItem>
          </SelectContent>
        </Select>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-40 h-10 bg-background/50">
            <SelectValue placeholder="Nível" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os níveis</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs List */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          {!logsList || logsList.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum log encontrado</p>
              <p className="text-xs mt-1">Os logs aparecerão conforme o sistema for utilizado</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {logsList.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-4 py-3 hover:bg-accent/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {getLevelIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {getTypeBadge(log.type)}
                        {getLevelBadge(log.level)}
                        {log.sourceIp && (
                          <span className="text-[10px] font-mono text-muted-foreground">{log.sourceIp}</span>
                        )}
                      </div>
                      <p className="text-sm">{log.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </p>
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
