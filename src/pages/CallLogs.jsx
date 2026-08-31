import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  PhoneCall,
  X,
  Volume2,
  FileText,
  Clock,
  User,
  Phone,
  DollarSign,
  Calendar,
  Sparkles
} from "lucide-react";
import supabase from "../supabase";

const API_URL = import.meta.env.DEV
  ? "http://localhost:3000"
  : import.meta.env.VITE_API_URL || "https://aise-cold-caller.onrender.com";

const getRecordingUrl = (call) => {
  if (!call) return null;
  if (call.call_id) {
    return `${API_URL}/api/recording/${call.call_id}`;
  }
  return call.recording_url;
};

export default function CallLogs() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    const { data } = await supabase
      .from("calls")
      .select("*")
      .order("created_at", { ascending: false });
    setCalls(data || []);
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
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const filtered = calls.filter((c) => {
    const matchesFilter =
      filter === "all" || (c.outcome || "").includes(filter);
    const matchesSearch =
      !search ||
      (c.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.customer_phone || "").includes(search);
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div className="skeleton" style={{ height: "48px", borderRadius: "12px" }} />
        <div className="skeleton" style={{ height: "400px", borderRadius: "16px" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
      {/* Left Main Content Table */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Search & Filter Toolbar */}
        <div
          className="glass-card"
          style={{
            padding: "16px 20px",
            display: "flex",
            gap: "16px",
            alignItems: "center"
          }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)"
              }}
            />
            <input
              type="text"
              placeholder="Search by lead name or phone number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px 10px 42px",
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                color: "#ffffff",
                fontSize: "14px",
                fontFamily: "var(--font-body)",
                outline: "none"
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Filter size={16} style={{ color: "var(--text-muted)" }} />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: "10px 16px",
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                color: "var(--text-primary)",
                fontSize: "14px",
                fontFamily: "var(--font-body)",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="all">All Outcomes</option>
              <option value="customer-ended">Completed</option>
              <option value="voicemail">Voicemail</option>
              <option value="busy">Busy / No Answer</option>
              <option value="error">Error / Failed</option>
            </select>
          </div>
        </div>

        {/* Calls Table */}
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(10, 16, 30, 0.9)" }}>
                {["Lead Name", "Phone", "Duration", "Outcome", "Date & Time"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "14px 20px",
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
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: "48px",
                      textAlign: "center",
                      color: "var(--text-secondary)",
                      fontSize: "14px"
                    }}
                  >
                    No call logs matching search criteria
                  </td>
                </tr>
              ) : (
                filtered.map((call, i) => {
                  const isSelected = selected?.id === call.id;
                  return (
                    <tr
                      key={call.id || i}
                      onClick={() => setSelected(call)}
                      style={{
                        borderTop: "1px solid var(--border)",
                        background: isSelected ? "rgba(0, 212, 255, 0.08)" : "transparent",
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td style={{ padding: "14px 20px", fontSize: "14px", fontWeight: "600", color: "#ffffff" }}>
                        {call.customer_name || "Lead #" + (call.customer_phone ? call.customer_phone.slice(-4) : "—")}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: "13px", color: "var(--text-secondary)" }}>
                        {call.customer_phone}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: "13px", color: "var(--text-secondary)" }}>
                        {formatDuration(call.duration_seconds)}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span className={`badge ${getOutcomeBadgeClass(call.outcome)}`}>
                          {call.outcome || "unknown"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: "13px", color: "var(--text-secondary)" }}>
                        {call.created_at ? new Date(call.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Drawer: Call Details */}
      {selected && (
        <div
          className="glass-card animate-fade-in"
          style={{
            width: "360px",
            padding: "24px",
            position: "sticky",
            top: "92px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <PhoneCall size={18} style={{ color: "var(--accent)" }} />
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: "700", color: "#ffffff" }}>
                Call Details
              </h3>
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "4px"
              }}
            >
              <X size={18} />
            </button>
          </div>

          {[
            { label: "Lead Name", value: selected.customer_name || "—", icon: User },
            { label: "Phone Number", value: selected.customer_phone, icon: Phone },
            { label: "Duration", value: formatDuration(selected.duration_seconds), icon: Clock },
            { label: "Outcome", value: selected.outcome || "unknown", icon: Sparkles },
            { label: "Cost", value: selected.cost ? `$${selected.cost}` : "$0", icon: DollarSign },
            { label: "Date Logged", value: selected.created_at ? new Date(selected.created_at).toLocaleString() : "—", icon: Calendar },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "13px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)" }}>
                <Icon size={14} style={{ color: "var(--text-muted)" }} />
                <span>{label}</span>
              </div>
              <span style={{ fontWeight: "600", color: "#ffffff", textAlign: "right" }}>
                {value}
              </span>
            </div>
          ))}

          {selected.summary && (
            <div style={{ marginTop: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <FileText size={14} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  AI Conversation Summary
                </span>
              </div>
              <div style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "12px",
                fontSize: "13px",
                color: "var(--text-secondary)",
                lineHeight: "1.6"
              }}>
                {selected.summary}
              </div>
            </div>
          )}

          {(selected.recording_url || selected.call_id) && (
            <div style={{ marginTop: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <Volume2 size={14} style={{ color: "var(--accent-green)" }} />
                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Audio Recording
                </span>
              </div>
              <audio
                controls
                src={getRecordingUrl(selected)}
                style={{ width: "100%", borderRadius: "8px", filter: "invert(0.9) hue-rotate(180deg)" }}
              />
            </div>
          )}

          {selected.transcript && (
            <div style={{ marginTop: "20px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "8px" }}>
                Transcript
              </span>
              <div
                style={{
                  maxHeight: "180px",
                  overflowY: "auto",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  lineHeight: "1.7",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  padding: "12px",
                  borderRadius: "10px"
                }}
              >
                {selected.transcript}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
