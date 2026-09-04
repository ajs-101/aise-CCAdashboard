import { useState, useEffect } from "react";
import supabase from "../supabase";
import {
  Users,
  Phone,
  Clock,
  Search,
  RefreshCw,
  Send,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Sparkles,
  PhoneForwarded,
  Flame,
  Check,
  Building2,
  MapPin,
  Briefcase,
  Layers,
} from "lucide-react";

const API_URL = import.meta.env.DEV
  ? "http://localhost:3000"
  : import.meta.env.VITE_API_URL || "https://aise-cold-caller.onrender.com";

export default function LeadsBoard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  // Quick SMS Modal State
  const [smsModalLead, setSmsModalLead] = useState(null);
  const [smsBody, setSmsBody] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [smsSuccess, setSmsSuccess] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(250);

      if (filterStatus !== "ALL") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) {
        console.warn("⚠️ [LeadsBoard] Supabase query error:", error.message);
        setLeads([]);
      } else {
        setLeads(data || []);
      }
    } catch (err) {
      console.error("❌ [LeadsBoard] Error:", err.message);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [filterStatus]);

  // Local window status helper
  const getWindowStatus = (timezone) => {
    try {
      const now = new Date();
      const options = {
        timeZone: timezone || "America/New_York",
        hour: "numeric",
        minute: "numeric",
        weekday: "short",
        hour12: false,
      };
      const formatter = new Intl.DateTimeFormat("en-US", options);
      const parts = formatter.formatToParts(now);
      let hour = 0;
      let minute = 0;
      let weekday = "";
      for (const p of parts) {
        if (p.type === "hour") hour = parseInt(p.value, 10);
        if (p.type === "minute") minute = parseInt(p.value, 10);
        if (p.type === "weekday") weekday = p.value;
      }
      if (weekday === "Sat" || weekday === "Sun") {
        return { isOpen: false, label: "Weekend", fullLabel: "Weekend (Closed)" };
      }
      const dec = hour + minute / 60;
      const isOpen = dec >= 8.0 && dec < 17.5;
      const timeStr = `${hour % 12 || 12}:${minute < 10 ? "0" : ""}${minute} ${hour >= 12 ? "PM" : "AM"}`;
      return {
        isOpen,
        timeStr,
        label: isOpen ? "Calling Open" : "Closed",
        fullLabel: `${timeStr} (${isOpen ? "Open" : "Closed"})`,
      };
    } catch {
      return { isOpen: true, timeStr: "Now", label: "Open", fullLabel: "Open" };
    }
  };

  const handleManualCall = async (lead) => {
    setActionLoading(lead.id);
    try {
      const res = await fetch(`${API_URL}/api/make-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: lead.phone_e164,
          firstName: lead.first_name,
          lastName: lead.last_name,
          firmName: lead.firm_name,
          practiceArea: lead.practice_area,
          city: lead.city,
        }),
      });
      const data = await res.json();
      if (data.success || data.id) {
        alert(`📞 Call dispatched for ${lead.first_name || lead.phone_e164}!`);
        fetchLeads();
      } else {
        alert(`❌ Call failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      alert(`❌ Error dispatching call: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendSms = async () => {
    if (!smsBody.trim() || !smsModalLead) return;
    setSmsSending(true);
    try {
      const res = await fetch(`${API_URL}/api/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: smsModalLead.id,
          phone: smsModalLead.phone_e164,
          body: smsBody,
          firstName: smsModalLead.first_name,
          firmName: smsModalLead.firm_name,
          practiceArea: smsModalLead.practice_area,
        }),
      });
      const data = await res.json();
      if (data.success || data.status === "sent") {
        setSmsSuccess(true);
        setTimeout(() => {
          setSmsModalLead(null);
          setSmsBody("");
          setSmsSuccess(false);
        }, 1500);
      } else {
        alert(`❌ SMS failed: ${data.error || "Check Twilio credentials"}`);
      }
    } catch (err) {
      alert(`❌ Error sending SMS: ${err.message}`);
    } finally {
      setSmsSending(false);
    }
  };

  const handleMarkDnc = async (lead) => {
    if (!confirm(`Add ${lead.phone_e164} (${lead.first_name}) to Do Not Call?`)) return;
    try {
      await supabase.from("do_not_call").upsert(
        {
          phone: lead.phone_e164,
          reason: "Manually marked DNC from Live Leads Board",
        },
        { onConflict: "phone" }
      );

      await supabase
        .from("leads")
        .update({ status: "DO_NOT_CONTACT", updated_at: new Date().toISOString() })
        .eq("id", lead.id);

      fetchLeads();
    } catch (err) {
      alert(`Error updating DNC: ${err.message}`);
    }
  };

  const filteredLeads = leads.filter((l) => {
    const term = searchTerm.toLowerCase();
    return (
      (l.first_name || "").toLowerCase().includes(term) ||
      (l.last_name || "").toLowerCase().includes(term) ||
      (l.firm_name || "").toLowerCase().includes(term) ||
      (l.phone_e164 || "").includes(term) ||
      (l.city || "").toLowerCase().includes(term) ||
      (l.practice_area_spoken || l.practice_area || "").toLowerCase().includes(term)
    );
  });

  // Calculate Stat Pill Counts
  const counts = {
    total: leads.length,
    ready: leads.filter((l) => l.status === "READY").length,
    inSequence: leads.filter((l) => l.status === "FOLLOW_UP").length,
    interested: leads.filter((l) => l.status === "INTERESTED").length,
    booked: leads.filter((l) => l.status === "BOOKED").length,
    replied: leads.filter((l) => l.status === "REPLIED").length,
    callback: leads.filter((l) => l.status === "CALLBACK_REQUESTED").length,
    dnc: leads.filter((l) => l.status === "DO_NOT_CONTACT").length,
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "BOOKED":
        return <span className="badge badge-green">🎯 Booked</span>;
      case "INTERESTED":
        return <span className="badge badge-cyan">🔥 Interested</span>;
      case "REPLIED":
        return <span className="badge badge-yellow">💬 Replied</span>;
      case "CALLBACK_REQUESTED":
        return <span className="badge badge-cyan" style={{ borderColor: "#818cf8", color: "#a5b4fc", background: "rgba(129, 140, 248, 0.15)" }}>⏰ Callback</span>;
      case "CALLING":
        return <span className="badge badge-cyan" style={{ animation: "pulseGlow 1.5s infinite" }}>📞 Calling</span>;
      case "FOLLOW_UP":
        return <span className="badge badge-cyan" style={{ borderColor: "#c084fc", color: "#e879f9", background: "rgba(192, 132, 252, 0.15)" }}>📅 In Sequence</span>;
      case "READY":
        return <span className="badge badge-cyan" style={{ borderColor: "rgba(0, 212, 255, 0.4)", color: "#38bdf8", background: "rgba(0, 212, 255, 0.1)" }}>⏳ Ready</span>;
      case "DO_NOT_CONTACT":
        return <span className="badge badge-red">🛑 DNC</span>;
      case "NURTURE":
        return <span className="badge badge-gray" style={{ color: "#94a3b8", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>🌱 Nurture</span>;
      default:
        return <span className="badge badge-gray" style={{ color: "#94a3b8", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>{status || "NEW"}</span>;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animate-fade-in">
      {/* Header & Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)",
                border: "1px solid rgba(0, 212, 255, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
                boxShadow: "0 0 20px rgba(0, 212, 255, 0.2)",
              }}
            >
              <Users size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: "22px", fontFamily: "var(--font-display)", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em" }}>
                Live Leads & Outreach Board
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                State-machine tracking for all persistent leads across the 12-business-day sequence.
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={async () => {
              if (!confirm("Start dialing ready leads whose calling window is open?")) return;
              setActionLoading("batch-dial");
              try {
                const res = await fetch(`${API_URL}/api/scheduler/dial-ready`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ limit: 10 }),
                });
                const data = await res.json();
                alert(`🚀 Scheduler Batch: Triggered ${data.triggered || 0} outbound calls!`);
                fetchLeads();
              } catch (err) {
                alert(`❌ Error starting dialer: ${err.message}`);
              } finally {
                setActionLoading(null);
              }
            }}
            disabled={actionLoading === "batch-dial"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "linear-gradient(135deg, #00d4ff 0%, #0088ff 100%)",
              color: "#040914",
              border: "none",
              borderRadius: "10px",
              padding: "9px 18px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0, 212, 255, 0.3)",
              transition: "all 0.2s",
            }}
          >
            <Phone size={15} />
            {actionLoading === "batch-dial" ? "Dialing..." : "Start Auto-Dialer Now"}
          </button>

          <button
            onClick={fetchLeads}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "10px",
              padding: "9px 16px",
              color: "var(--text-primary)",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
              backdropFilter: "blur(8px)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)")}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} style={{ color: "var(--accent)" }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Counter Ribbon */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
        }}
      >
        {[
          { label: "Total Leads", count: counts.total, color: "#00d4ff", icon: Layers },
          { label: "Ready to Dial", count: counts.ready, color: "#38bdf8", icon: Clock },
          { label: "In Sequence", count: counts.inSequence, color: "#c084fc", icon: Calendar },
          { label: "Interested", count: counts.interested, color: "#f59e0b", icon: Flame },
          { label: "Booked", count: counts.booked, color: "#10b981", icon: CheckCircle2 },
          { label: "SMS Replied", count: counts.replied, color: "#fbbf24", icon: MessageSquare },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className="glass-card"
              style={{
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                borderRadius: "12px",
              }}
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  background: `${item.color}15`,
                  border: `1px solid ${item.color}35`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: item.color,
                }}
              >
                <Icon size={17} />
              </div>
              <div>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff", lineHeight: 1.2 }}>
                  {item.count}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600" }}>
                  {item.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs & Search Card */}
      <div
        className="glass-card"
        style={{
          padding: "14px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        {/* Status Filter Tabs */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            { id: "ALL", label: "All Leads", count: counts.total },
            { id: "READY", label: "Ready", count: counts.ready },
            { id: "FOLLOW_UP", label: "In Sequence", count: counts.inSequence },
            { id: "INTERESTED", label: "Interested", count: counts.interested },
            { id: "BOOKED", label: "Booked", count: counts.booked },
            { id: "REPLIED", label: "Replied", count: counts.replied },
            { id: "CALLBACK_REQUESTED", label: "Callback", count: counts.callback },
            { id: "DO_NOT_CONTACT", label: "DNC", count: counts.dnc },
          ].map((tab) => {
            const isActive = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                style={{
                  padding: "7px 13px",
                  borderRadius: "9px",
                  fontSize: "12px",
                  fontWeight: isActive ? "700" : "500",
                  cursor: "pointer",
                  border: isActive ? "1px solid rgba(0, 212, 255, 0.4)" : "1px solid rgba(255, 255, 255, 0.06)",
                  background: isActive
                    ? "linear-gradient(135deg, rgba(0, 212, 255, 0.18) 0%, rgba(0, 136, 255, 0.1) 100%)"
                    : "rgba(10, 15, 29, 0.5)",
                  color: isActive ? "#00d4ff" : "var(--text-secondary)",
                  boxShadow: isActive ? "0 2px 10px rgba(0, 212, 255, 0.2)" : "none",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: "10px",
                    padding: "1px 6px",
                    borderRadius: "6px",
                    background: isActive ? "rgba(0, 212, 255, 0.25)" : "rgba(255, 255, 255, 0.06)",
                    color: isActive ? "#ffffff" : "var(--text-muted)",
                    fontWeight: "700",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", minWidth: "260px" }}>
          <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search name, firm, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "8px 14px 8px 34px",
              width: "100%",
              fontSize: "12px",
              background: "rgba(10, 16, 30, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              color: "#ffffff",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.1)")}
          />
        </div>
      </div>

      {/* Leads Table Card */}
      <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "14px 20px", color: "var(--text-muted)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Lead / Contact
                </th>
                <th style={{ padding: "14px 20px", color: "var(--text-muted)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Firm & Specialty
                </th>
                <th style={{ padding: "14px 20px", color: "var(--text-muted)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Timezone & Local Window
                </th>
                <th style={{ padding: "14px 20px", color: "var(--text-muted)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Sequence Stage
                </th>
                <th style={{ padding: "14px 20px", color: "var(--text-muted)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Status
                </th>
                <th style={{ padding: "14px 20px", color: "var(--text-muted)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Next Scheduled
                </th>
                <th style={{ padding: "14px 20px", color: "var(--text-muted)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>
                  Quick Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: "50px", textAlign: "center", color: "var(--text-muted)" }}>
                    <RefreshCw size={26} className="animate-spin" style={{ margin: "0 auto 12px", color: "var(--accent)" }} />
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>Loading persistent outreach leads...</div>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "50px", textAlign: "center", color: "var(--text-muted)" }}>
                    <Users size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>No leads found in this view</div>
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>Upload a CSV campaign to populate new leads automatically.</div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const win = getWindowStatus(lead.timezone);
                  const stageNum = lead.follow_up_stage || 0;

                  return (
                    <tr
                      key={lead.id}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Contact Info */}
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ fontWeight: "700", color: "#ffffff", fontSize: "14px" }}>
                          {lead.first_name} {lead.last_name || ""}
                        </div>
                        <div style={{ color: "var(--accent)", fontSize: "12px", marginTop: "2px", fontFamily: "monospace" }}>
                          {lead.phone_e164}
                        </div>
                      </td>

                      {/* Firm & Specialty */}
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "13px" }}>
                          {lead.firm_name || lead.company_name || "Independent"}
                        </div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                          <span>{lead.practice_area_spoken || lead.practice_area || "Attorney"}</span>
                          <span>•</span>
                          <span style={{ color: "var(--text-muted)" }}>{lead.city || "USA"}</span>
                        </div>
                      </td>

                      {/* Timezone & Window */}
                      <td style={{ padding: "14px 20px" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "3px 9px",
                            borderRadius: "6px",
                            background: win.isOpen ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.1)",
                            border: win.isOpen ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(239, 68, 68, 0.2)",
                          }}
                        >
                          <span
                            style={{
                              height: "6px",
                              width: "6px",
                              borderRadius: "50%",
                              background: win.isOpen ? "#10b981" : "#ef4444",
                              boxShadow: win.isOpen ? "0 0 8px #10b981" : "none",
                            }}
                          />
                          <span style={{ fontSize: "12px", color: win.isOpen ? "#34d399" : "#f87171", fontWeight: "700" }}>
                            {win.fullLabel}
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px" }}>
                          {lead.timezone || "America/New_York"}
                        </div>
                      </td>

                      {/* Sequence Stage */}
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>
                          Stage {stageNum} <span style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: "500" }}>/ 5</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                          {lead.attempt_count || 0} dials • {lead.voicemail_count || 0} VMs
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 20px" }}>{getStatusBadge(lead.status)}</td>

                      {/* Next Scheduled Action */}
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: "600" }}>
                          {lead.next_action_at
                            ? new Date(lead.next_action_at).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {lead.next_action_at
                            ? new Date(lead.next_action_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                          {/* Call Button */}
                          <button
                            onClick={() => handleManualCall(lead)}
                            disabled={actionLoading === lead.id}
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              background: "rgba(0, 212, 255, 0.1)",
                              border: "1px solid rgba(0, 212, 255, 0.25)",
                              color: "#00d4ff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(0, 212, 255, 0.25)";
                              e.currentTarget.style.boxShadow = "0 0 12px rgba(0, 212, 255, 0.4)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(0, 212, 255, 0.1)";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                            title="Trigger Outbound Call"
                          >
                            <Phone size={14} />
                          </button>

                          {/* SMS Button */}
                          <button
                            onClick={() => {
                              setSmsModalLead(lead);
                              setSmsBody(
                                `Hi ${lead.first_name}, Alexa at AI Search Engineers. Following up on our search for ${lead.practice_area_spoken || 'attorneys'} in ${lead.city}. Worth 10 mins?`
                              );
                            }}
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              background: "rgba(56, 189, 248, 0.1)",
                              border: "1px solid rgba(56, 189, 248, 0.25)",
                              color: "#38bdf8",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(56, 189, 248, 0.25)";
                              e.currentTarget.style.boxShadow = "0 0 12px rgba(56, 189, 248, 0.4)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(56, 189, 248, 0.1)";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                            title="Send SMS"
                          >
                            <MessageSquare size={14} />
                          </button>

                          {/* DNC Button */}
                          <button
                            onClick={() => handleMarkDnc(lead)}
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              background: "rgba(239, 68, 68, 0.1)",
                              border: "1px solid rgba(239, 68, 68, 0.25)",
                              color: "#ef4444",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)";
                              e.currentTarget.style.boxShadow = "0 0 12px rgba(239, 68, 68, 0.4)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                            title="Add to Do Not Call"
                          >
                            <ShieldAlert size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick SMS Modal */}
      {smsModalLead && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            backdropFilter: "blur(6px)",
          }}
        >
          <div className="glass-card" style={{ width: "480px", maxWidth: "90%", padding: "26px", border: "1px solid rgba(0, 212, 255, 0.3)", boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#ffffff", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Send size={18} style={{ color: "var(--accent)" }} />
              Send SMS to {smsModalLead.first_name}
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px" }}>
              {smsModalLead.firm_name} • {smsModalLead.phone_e164}
            </p>

            <textarea
              rows={4}
              value={smsBody}
              onChange={(e) => setSmsBody(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(10, 16, 30, 0.9)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "10px",
                color: "#ffffff",
                fontSize: "13px",
                resize: "none",
                marginBottom: "16px",
                outline: "none",
                fontFamily: "var(--font-body)",
              }}
              placeholder="Type your SMS message..."
            />

            {smsSuccess && (
              <div style={{ color: "#10b981", fontSize: "13px", fontWeight: "600", marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={16} /> SMS sent successfully!
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setSmsModalLead(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendSms}
                disabled={smsSending || !smsBody.trim()}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #00d4ff 0%, #0088ff 100%)",
                  border: "none",
                  color: "#040914",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "700",
                  boxShadow: "0 4px 14px rgba(0, 212, 255, 0.3)",
                }}
              >
                {smsSending ? "Sending..." : "Send SMS"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
