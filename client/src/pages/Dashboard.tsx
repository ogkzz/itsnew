import { useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/hooks/useSocket";
import { useLocalAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import {
  Shield, ShieldAlert, ShieldX, Activity, Eye, Clock, TrendingUp,
  Wifi, WifiOff, Zap, BarChart3, Globe
} from "lucide-react";
import { motion } from "framer-motion";

const STATUS_COLORS = {
  safe: "#22c55e",
  suspicious: "#eab308",
  confirmed: "#ef4444",
};

const DETECTION_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function StatCard({ title, value, icon: Icon, color, glowClass }: {
  title: string; value: number | string; icon: any; color: string; glowClass?: string;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-card/60 border-border/40 card-hover group relative overflow-hidden">
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${glowClass || ''}`} />
        <CardContent className="p-5 relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">{title}</p>
              <p className={`text-3xl font-bold mt-1.5 tracking-tight ${color}`}>{value}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}
              style={{ backgroundColor: `color-mix(in oklch, ${color === 'text-foreground' ? '#3b82f6' : ''}, transparent 88%)` }}
            >
              <Icon className={`w-5 h-5 ${color === 'text-foreground' ? 'text-primary' : color}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case "safe": return <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px] font-semibold">Seguro</Badge>;
    case "suspicious": return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[10px] font-semibold">Suspeito</Badge>;
    case "confirmed": return <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] font-semibold">Confirmado</Badge>;
    default: return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}

const tooltipStyle = {
  backgroundColor: "rgba(15, 15, 25, 0.95)",
  border: "1px solid rgba(59, 130, 246, 0.15)",
  borderRadius: "10px",
  color: "#e2e8f0",
  fontSize: "12px",
  backdropFilter: "blur(8px)",
};

export default function Dashboard() {
  const { username } = useLocalAuth();
  const { data: stats, refetch: refetchStats } = trpc.dashboard.stats.useQuery({ username: username || "free" });
  const { data: recentAnalyses, refetch: refetchRecent } = trpc.dashboard.recentAnalyses.useQuery({ username: username || "free" });
  const { subscribe, on, connected } = useSocket();

  useEffect(() => {
    subscribe("dashboard");
    const unsub1 = on("analysis:new", () => { refetchStats(); refetchRecent(); });
    const unsub2 = on("stats:update", () => { refetchStats(); });
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
      { name: "Proxy/VPN", value: Math.round(Number(dt.avgProxyVpn || 0)), fullMark: 100 },
      { name: "Domínio", value: Math.round(Number(dt.avgDomain || 0)), fullMark: 100 },
      { name: "Fingerprint", value: Math.round(Number(dt.avgFingerprint || 0)), fullMark: 100 },
      { name: "Jailbreak", value: Math.round(Number(dt.avgJailbreak || 0)), fullMark: 100 },
      { name: "Manipulação", value: Math.round(Number(dt.avgManipulation || 0)), fullMark: 100 },
    ];
  }, [stats]);

  const totalAnalyses = Number(stats?.totalAnalyses || 0);
  const safeCount = Number(stats?.safe || 0);
  const suspiciousCount = Number(stats?.suspicious || 0);
  const confirmedCount = Number(stats?.confirmed || 0);
  const threatRate = totalAnalyses > 0 ? Math.round(((suspiciousCount + confirmedCount) / totalAnalyses) * 100) : 0;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Monitoramento em tempo real do sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 border border-border/40">
            {connected ? (
              <Wifi className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
            )}
            <span className="text-xs text-muted-foreground">{connected ? "Live" : "Offline"}</span>
            {connected && <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard title="Total Análises" value={totalAnalyses} icon={Activity} color="text-foreground" />
        <StatCard title="Seguros" value={safeCount} icon={Shield} color="text-green-400" />
        <StatCard title="Suspeitos" value={suspiciousCount} icon={ShieldAlert} color="text-yellow-400" />
        <StatCard title="Confirmados" value={confirmedCount} icon={ShieldX} color="text-red-400" />
        <StatCard title="Taxa de Ameaça" value={`${threatRate}%`} icon={Zap} color="text-primary" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Distribution - Pie */}
        <motion.div variants={itemVariants}>
          <Card className="bg-card/60 border-border/40 h-full">
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Distribuição
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="48%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend
                      verticalAlign="bottom"
                      iconSize={8}
                      formatter={(value) => <span className="text-xs text-muted-foreground ml-1">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Detection Types - Bar */}
        <motion.div variants={itemVariants}>
          <Card className="bg-card/60 border-border/40 h-full">
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Scores Médios
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={detectionData} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.06)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "rgba(148, 163, 184, 0.7)", fontSize: 10 }}
                      axisLine={{ stroke: "rgba(59, 130, 246, 0.1)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "rgba(148, 163, 184, 0.7)", fontSize: 10 }}
                      axisLine={{ stroke: "rgba(59, 130, 246, 0.1)" }}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {detectionData.map((_, index) => (
                        <Cell key={`bar-${index}`} fill={DETECTION_COLORS[index % DETECTION_COLORS.length]} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Radar Chart */}
        <motion.div variants={itemVariants}>
          <Card className="bg-card/60 border-border/40 h-full">
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Radar de Ameaças
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={detectionData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="rgba(59, 130, 246, 0.1)" />
                    <PolarAngleAxis
                      dataKey="name"
                      tick={{ fill: "rgba(148, 163, 184, 0.7)", fontSize: 9 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: "rgba(148, 163, 184, 0.4)", fontSize: 8 }}
                    />
                    <Radar
                      name="Score"
                      dataKey="value"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Analyses Table */}
      <motion.div variants={itemVariants}>
        <Card className="bg-card/60 border-border/40">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Análises Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {!recentAnalyses || recentAnalyses.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-7 h-7 text-primary/30" />
                </div>
                <p className="text-sm font-medium">Nenhuma análise realizada</p>
                <p className="text-xs mt-1.5 text-muted-foreground/60">Execute uma análise para ver os resultados aqui</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">IP</th>
                      <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">Score</th>
                      <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">Status</th>
                      <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">Detecções</th>
                      <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAnalyses.map((analysis, idx) => (
                      <motion.tr
                        key={analysis.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-border/15 hover:bg-primary/3 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-mono text-xs text-foreground/80">{analysis.sourceIp}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${analysis.totalScore}%`,
                                  backgroundColor: analysis.totalScore <= 30 ? '#22c55e' : analysis.totalScore <= 70 ? '#eab308' : '#ef4444',
                                }}
                              />
                            </div>
                            <span className={`font-bold text-xs tabular-nums ${
                              analysis.totalScore <= 30 ? "text-green-400" :
                              analysis.totalScore <= 70 ? "text-yellow-400" : "text-red-400"
                            }`}>
                              {analysis.totalScore}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">{getStatusBadge(analysis.status)}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-xs text-muted-foreground">{analysis.step}</span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-muted-foreground/60 tabular-nums">
                          {new Date(analysis.createdAt).toLocaleString("pt-BR")}
                        </td>
                      </motion.tr>
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
