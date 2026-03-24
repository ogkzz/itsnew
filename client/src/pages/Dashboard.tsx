import { useEffect, useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/hooks/useSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend
} from "recharts";
import {
  Shield, ShieldAlert, ShieldX, Activity, Eye, FileText, Clock, TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";

const STATUS_COLORS = {
  safe: "#4ade80",
  suspicious: "#facc15",
  confirmed: "#f87171",
};

const DETECTION_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444"];

export default function Dashboard() {
  const { data: stats, refetch: refetchStats } = trpc.dashboard.stats.useQuery();
  const { data: recentAnalyses, refetch: refetchRecent } = trpc.dashboard.recentAnalyses.useQuery();
  const { subscribe, on, connected } = useSocket();

  useEffect(() => {
    subscribe("dashboard");
    const unsub1 = on("analysis:new", () => {
      refetchStats();
      refetchRecent();
    });
    const unsub2 = on("stats:update", () => {
      refetchStats();
    });
    return () => { unsub1(); unsub2(); };
  }, [subscribe, on, refetchStats, refetchRecent]);

  const statusData = useMemo(() => [
    { name: "Seguro", value: Number(stats?.safe || 0), color: STATUS_COLORS.safe },
    { name: "Suspeito", value: Number(stats?.suspicious || 0), color: STATUS_COLORS.suspicious },
    { name: "Confirmado", value: Number(stats?.confirmed || 0), color: STATUS_COLORS.confirmed },
  ], [stats]);

  const detectionData = useMemo(() => {
    const dt = stats?.detectionTypes as any;
    if (!dt) return [];
    return [
      { name: "Proxy/VPN", value: Math.round(Number(dt.avgProxyVpn || 0)) },
      { name: "Domínio", value: Math.round(Number(dt.avgDomain || 0)) },
      { name: "Fingerprint", value: Math.round(Number(dt.avgFingerprint || 0)) },
      { name: "Jailbreak", value: Math.round(Number(dt.avgJailbreak || 0)) },
      { name: "Manipulação", value: Math.round(Number(dt.avgManipulation || 0)) },
    ];
  }, [stats]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  function getStatusBadge(status: string) {
    switch (status) {
      case "safe": return <Badge className="bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/20">Seguro</Badge>;
      case "suspicious": return <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20">Suspeito</Badge>;
      case "confirmed": return <Badge className="bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/20">Confirmado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral do sistema em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          <span className="text-xs text-muted-foreground">{connected ? "Conectado" : "Desconectado"}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Análises</p>
                  <p className="text-3xl font-bold mt-1">{stats?.totalAnalyses || 0}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-card/50 border-border/50 hover:border-green-500/30 transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Seguros</p>
                  <p className="text-3xl font-bold mt-1 text-green-400">{Number(stats?.safe || 0)}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-card/50 border-border/50 hover:border-yellow-500/30 transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Suspeitos</p>
                  <p className="text-3xl font-bold mt-1 text-yellow-400">{Number(stats?.suspicious || 0)}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-card/50 border-border/50 hover:border-red-500/30 transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmados</p>
                  <p className="text-3xl font-bold mt-1 text-red-400">{Number(stats?.confirmed || 0)}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <ShieldX className="w-5 h-5 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <motion.div variants={itemVariants}>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Distribuição de Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.16 0.015 260)",
                        border: "1px solid oklch(0.25 0.02 260)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Detection Types */}
        <motion.div variants={itemVariants}>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Tipos de Detecção (Média)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={detectionData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.02 260)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "oklch(0.6 0.02 260)", fontSize: 11 }}
                      axisLine={{ stroke: "oklch(0.25 0.02 260)" }}
                    />
                    <YAxis
                      tick={{ fill: "oklch(0.6 0.02 260)", fontSize: 11 }}
                      axisLine={{ stroke: "oklch(0.25 0.02 260)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.16 0.015 260)",
                        border: "1px solid oklch(0.25 0.02 260)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {detectionData.map((_, index) => (
                        <Cell key={`bar-${index}`} fill={DETECTION_COLORS[index % DETECTION_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Analyses */}
      <motion.div variants={itemVariants}>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Análises Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentAnalyses || recentAnalyses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma análise realizada ainda</p>
                <p className="text-xs mt-1">Execute uma análise para ver os resultados aqui</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">IP</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Etapa</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAnalyses.map((analysis) => (
                      <tr key={analysis.id} className="border-b border-border/30 hover:bg-accent/30 transition-colors">
                        <td className="py-3 px-3 font-mono text-xs">{analysis.sourceIp}</td>
                        <td className="py-3 px-3">
                          <span className={`font-semibold ${
                            analysis.totalScore <= 30 ? "text-green-400" :
                            analysis.totalScore <= 70 ? "text-yellow-400" : "text-red-400"
                          }`}>
                            {analysis.totalScore}
                          </span>
                        </td>
                        <td className="py-3 px-3">{getStatusBadge(analysis.status)}</td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="text-xs">{analysis.step}</Badge>
                        </td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">
                          {new Date(analysis.createdAt).toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
