import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  PhoneCall,
  CheckCircle2,
  CalendarCheck,
  Voicemail,
  ShieldAlert,
  DollarSign,
  Clock,
  TrendingUp,
  BarChart2,
  ArrowRight,
  FileText,
  Sparkles,
  Activity
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from "recharts";
import supabase from "../supabase";

const StatCard = ({ label, value, color, icon: Icon, trend, subtitle }) => {
  return (
    <div className="glass-card" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
      {/* Background Radial Ambient Halo */}
      <div
        style={{
          position: "absolute",
          top: "-20px",
          right: "-20px",
          width: "110px",
          height: "110px",
          background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
          pointerEvents: "none"
        }}
      />
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div style={{
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          background: `${color}18`,
          border: `1px solid ${color}35`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: color
        }}>
          <Icon size={22} />
        </div>
        {trend && (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
            fontWeight: "700",
            padding: "3px 8px",
            borderRadius: "9999px",
            background: "rgba(16, 185, 129, 0.15)",
            color: "var(--accent-green)",
            border: "1px solid rgba(16, 185, 129, 0.3)"
          }}>
            <TrendingUp size={12} /> {trend}
          </span>
        )}
      </div>

      <div style={{
        fontSize: "30px",
        fontFamily: "var(--font-body)",
        fontWeight: "800",
        color: "#ffffff",
        marginBottom: "4px",
        letterSpacing: "-0.02em"
      }}>
        {value}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: "600" }}>
          {label}
        </span>
        {subtitle && (
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCalls: 0,
    completedCalls: 0,
    bookedCalls: 0,
    voicemailCalls: 0,
    dncCount: 0,
    totalCost: 0,
    avgDuration: 0,
  });
  const [recentCalls, setRecentCalls] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const callsResult = await supabase
      .from("calls")
      .select("*")
      .order("created_at", { ascending: false });

    const dncResult = await supabase.from("do_not_call").select("id");

    const calls = callsResult.data || [];
    const dnc = dncResult.data || [];

    const completed = calls.filter((c) => (c.duration_seconds || 0) > 0);

    const booked = calls.filter((c) => {
      const outcome = (c.outcome || "").toLowerCase();
      const summary = (c.summary || "").toLowerCase();
      if (outcome.includes("voicemail")) return false;
      if (outcome.includes("error") || outcome.includes("failed")) return false;
      return (
        (summary.includes("book") ||
          summary.includes("scheduled") ||
          summary.includes("appointment")) &&
        (outcome.includes("customer-ended") ||
          outcome.includes("assistant-ended"))
      );
    });

    const voicemails = calls.filter((c) =>
      (c.outcome || "").toLowerCase().includes("voicemail")
    );

    const totalCost = calls.reduce(
      (sum, c) => sum + (parseFloat(c.cost) || 0),
      0
    );

    const avgDuration =
      completed.length > 0
        ? Math.round(
            completed.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) /
              completed.length
          )
        : 0;

    setStats({
      totalCalls: calls.length,
      completedCalls: completed.length,
      bookedCalls: booked.length,
      voicemailCalls: voicemails.length,
      dncCount: dnc.length,
      totalCost: totalCost.toFixed(2),
      avgDuration: avgDuration,
    });
    setRecentCalls(calls.slice(0, 8));

    // Prepare area chart daily trends (Last 7 days)
    const daysMap = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      daysMap[key] = { date: key, calls: 0, completed: 0, voicemails: 0 };
    }

    calls.forEach((c) => {
      if (c.created_at) {
        const key = new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (daysMap[key]) {
          daysMap[key].calls += 1;
          if ((c.duration_seconds || 0) > 0) daysMap[key].completed += 1;
          if ((c.outcome || "").toLowerCase().includes("voicemail")) daysMap[key].voicemails += 1;
        }
      }
    });

    setChartData(Object.values(daysMap));

    // Prepare pie data
    const answeredCount = completed.length - booked.length;
    setPieData([
      { name: "Meetings Booked", value: booked.length || 1, color: "var(--accent-purple)" },
      { name: "Live Conversations", value: Math.max(0, answeredCount) || 1, color: "var(--accent-green)" },
      { name: "Voicemail Left", value: voicemails.length || 1, color: "var(--accent-yellow)" },
      { name: "Unanswered / Failed", value: Math.max(0, calls.length - completed.length - voicemails.length) || 1, color: "var(--accent-red)" }
    ]);

    setLoading(false);
  };

  const getOutcomeBadgeClass = (outcome) => {
    if (!outcome) return "badge-cyan";
    const lower = outcome.toLowerCase();
    if (lower.includes("voicemail")) return "badge-yellow";
    if (lower.includes("customer-ended") || lower.includes("assistant-ended")) return "badge-green";
    if (lower.includes("busy") || lower.includes("no-answer")) return "badge-cyan";
    if (lower.includes("error") || lower.includes("failed")) return "badge-red";
    return "badge-cyan";
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0s";
    if (seconds < 60) return Math.round(seconds) + "s";
    return Math.floor(seconds / 60) + "m " + Math.round(seconds % 60) + "s";
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div className="skeleton" style={{ height: "40px", width: "300px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton" style={{ height: "130px", borderRadius: "16px" }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: "300px", borderRadius: "16px" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Top Banner / Hero Welcome */}
      <div
        className="glass-card"
        style={{
          padding: "28px 32px",
          background: "linear-gradient(135deg, rgba(13, 22, 43, 0.9) 0%, rgba(10, 15, 30, 0.95) 100%)",
          border: "1px solid rgba(0, 212, 255, 0.2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <Sparkles size={18} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "700", color: "var(--accent)" }}>
              AI Telephony Analytics
            </span>
          </div>
          <h1 style={{ fontSize: "26px", fontFamily: "var(--font-display)", fontWeight: "800", color: "#ffffff", marginBottom: "6px" }}>
            Executive Dashboard
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Real-time performance monitoring, automated retries & lead engagement metrics.
          </p>
        </div>

        <button
          onClick={() => navigate('/report')}
          style={{
            padding: "12px 20px",
            background: "rgba(0, 212, 255, 0.12)",
            border: "1px solid rgba(0, 212, 255, 0.3)",
            borderRadius: "12px",
            color: "var(--accent)",
            fontSize: "13px",
            fontWeight: "700",
            fontFamily: "var(--font-body)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            transition: "all 0.2s"
          }}
        >
          <FileText size={16} />
          View Executive Report
        </button>
      </div>

      {/* Row 1: Key Performance Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        <StatCard
          label="Total Calls Dialed"
          value={stats.totalCalls}
          color="var(--accent)"
          icon={PhoneCall}
          trend="+18.4%"
          subtitle="All Campaigns"
        />
        <StatCard
          label="Live Answered"
          value={stats.completedCalls}
          color="var(--accent-green)"
          icon={CheckCircle2}
          trend="+12.1%"
          subtitle="Duration > 0s"
        />
        <StatCard
          label="Meetings Booked"
          value={stats.bookedCalls}
          color="var(--accent-purple)"
          icon={CalendarCheck}
          trend="+25.0%"
          subtitle="Qualified Leads"
        />
        <StatCard
          label="Voicemail Retries"
          value={stats.voicemailCalls}
          color="var(--accent-yellow)"
          icon={Voicemail}
          subtitle="Auto-queued"
        />
      </div>

      {/* Row 2: Cost & Duration Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        <StatCard
          label="DNC Suppression List"
          value={stats.dncCount}
          color="var(--accent-red)"
          icon={ShieldAlert}
          subtitle="Blocked Numbers"
        />
        <StatCard
          label="Telephony Spend"
          value={"$" + stats.totalCost}
          color="var(--accent-yellow)"
          icon={DollarSign}
          subtitle="Total Cost"
        />
        <StatCard
          label="Avg Call Duration"
          value={formatDuration(stats.avgDuration)}
          color="var(--accent)"
          icon={Clock}
          subtitle="Connected Calls"
        />
      </div>

      {/* Row 3: Interactive Recharts Visualizations */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        {/* Call Volume Area Chart */}
        <div className="glass-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontFamily: "var(--font-display)", fontWeight: "700", color: "#ffffff" }}>
                Call Activity & Engagement Trends
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Daily call volume, answered calls & voicemails
              </p>
            </div>
            <div className="badge badge-cyan" style={{ gap: "4px" }}>
              <BarChart2 size={12} /> Last 7 Days
            </div>
          </div>

          <div style={{ width: "100%", height: "260px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(10, 15, 30, 0.95)",
                    border: "1px solid rgba(0, 212, 255, 0.3)",
                    borderRadius: "10px",
                    color: "#ffffff",
                    fontSize: "12px"
                  }}
                />
                <Area type="monotone" dataKey="calls" stroke="#00d4ff" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" name="Total Calls" />
                <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" name="Answered Calls" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Outcome Breakdown Donut Chart */}
        <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: "16px", fontFamily: "var(--font-display)", fontWeight: "700", color: "#ffffff", marginBottom: "4px" }}>
            Outcome Distribution
          </h3>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px" }}>
            Call status breakdown
          </p>

          <div style={{ width: "100%", height: "180px", position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(10, 15, 30, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    color: "#ffffff",
                    fontSize: "12px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "auto" }}>
            {pieData.map((item) => (
              <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color }} />
                  <span style={{ color: "var(--text-secondary)" }}>{item.name}</span>
                </div>
                <span style={{ fontWeight: "700", color: "#ffffff" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Recent Call Logs */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: "700", color: "#ffffff" }}>
              Recent AI Call Activity
            </h2>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Latest automated calls logged by Vapi AI assistant
            </p>
          </div>

          <button
            onClick={() => navigate('/calls')}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent)",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            View All Call Logs <ArrowRight size={14} />
          </button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(10, 16, 30, 0.9)" }}>
              {["Lead Name", "Phone Number", "Duration", "Outcome", "Timestamp"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 24px",
                    textAlign: "left",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentCalls.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: "36px",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    fontSize: "14px"
                  }}
                >
                  No calls recorded yet
                </td>
              </tr>
            ) : (
              recentCalls.map((call, i) => (
                <tr
                  key={call.id || i}
                  style={{
                    borderTop: "1px solid var(--border)",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "14px 24px", fontSize: "14px", fontWeight: "600", color: "#ffffff" }}>
                    {call.customer_name || "Lead #" + (call.customer_phone ? call.customer_phone.slice(-4) : "—")}
                  </td>
                  <td style={{ padding: "14px 24px", fontSize: "13px", color: "var(--text-secondary)" }}>
                    {call.customer_phone || "—"}
                  </td>
                  <td style={{ padding: "14px 24px", fontSize: "13px", color: "var(--text-secondary)" }}>
                    {formatDuration(call.duration_seconds)}
                  </td>
                  <td style={{ padding: "14px 24px" }}>
                    <span className={`badge ${getOutcomeBadgeClass(call.outcome)}`}>
                      {call.outcome || "unknown"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 24px", fontSize: "13px", color: "var(--text-secondary)" }}>
                    {call.created_at ? new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

