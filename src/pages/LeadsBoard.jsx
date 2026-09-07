import { useState, useEffect, useRef } from "react";
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
  Flame,
  Play,
  Square,
  Sparkles,
  PhoneCall,
  Check,
  Building2,
  MapPin,
  Layers,
  CheckSquare,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "https://aise-cold-caller.onrender.com";

export default function LeadsBoard() {
  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("need_calling"); // "need_calling" | "called" | "hot" | "dnc"
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  // Checkbox Selection State
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());

  // Batch Calling State
  const [batchCalling, setBatchCalling] = useState(false);
  const [batchProgress, setBatchProgress] = useState({
    current: 0,
    total: 0,
    currentName: "",
  });
  const stopBatchRef = useRef(false);

  // Quick SMS Modal State
  const [smsModalLead, setSmsModalLead] = useState(null);
  const [smsBody, setSmsBody] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [smsSuccess, setSmsSuccess] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(250);

      if (error) {
        console.warn("⚠️ [LeadsBoard] Supabase error:", error.message);
        setAllLeads([]);
      } else {
        setAllLeads(data || []);
      }
    } catch (err) {
      console.error("❌ [LeadsBoard] Error:", err.message);
      setAllLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Clear selection on tab switch
  useEffect(() => {
    setSelectedLeadIds(new Set());
  }, [activeTab]);

  // Checkbox helpers
  const toggleSelectLead = (id) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (filteredList) => {
    if (
      filteredList.length > 0 &&
      selectedLeadIds.size === filteredList.length
    ) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredList.map((l) => l.id)));
    }
  };

  const clearSelection = () => {
    setSelectedLeadIds(new Set());
  };

  // Manual 1-Click Call
  const handleManualCall = async (lead) => {
    setActionLoading(lead.id);
    try {
      const res = await fetch(`${API_URL}/api/make-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          leadId: lead.id,
          phone: lead.phone_e164 || lead.phone,
          firstName: lead.first_name,
          lastName: lead.last_name,
          firmName: lead.firm_name,
          practiceArea: lead.practice_area,
          city: lead.city,
        }),
      });
      const data = await res.json();
      if (data.success || data.id) {
        alert(
          `📞 Call initiated for ${lead.first_name || lead.phone_e164 || lead.phone}!`,
        );
        // Optimistically update attempt count and last_called_at in local state immediately
        setAllLeads((prev) =>
          prev.map((l) =>
            l.id === lead.id
              ? {
                  ...l,
                  attempt_count: (l.attempt_count || 0) + 1,
                  status: "CALLING",
                  last_called_at: new Date().toISOString(),
                }
              : l,
          ),
        );
        fetchLeads();
      } else {
        alert(
          `❌ Call failed: ${data.error || "Check backend / Vapi credentials"}`,
        );
      }
    } catch (err) {
      alert(`❌ Error dispatching call: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Sequential Batch Calling for selected or tab leads
  const handleStartBatchCalling = async (leadsToCall) => {
    if (leadsToCall.length === 0) {
      alert("No leads selected to call.");
      return;
    }
    if (
      !confirm(
        `Start calling ${leadsToCall.length} selected lead(s) one-by-one?`,
      )
    )
      return;

    setBatchCalling(true);
    stopBatchRef.current = false;
    setBatchProgress({
      current: 0,
      total: leadsToCall.length,
      currentName: "",
    });

    for (let i = 0; i < leadsToCall.length; i++) {
      if (stopBatchRef.current) {
        alert("🛑 Batch calling paused/stopped.");
        break;
      }

      const lead = leadsToCall[i];
      setBatchProgress({
        current: i + 1,
        total: leadsToCall.length,
        currentName: `${lead.first_name || ""} ${lead.last_name || ""} (${lead.phone_e164 || lead.phone})`,
      });

      try {
        await fetch(`${API_URL}/api/make-call`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: lead.id,
            leadId: lead.id,
            phone: lead.phone_e164 || lead.phone,
            firstName: lead.first_name,
            lastName: lead.last_name,
            firmName: lead.firm_name,
            practiceArea: lead.practice_area,
            city: lead.city,
          }),
        });
      } catch (err) {
        console.error("Error dialing lead in batch:", lead.first_name, err);
      }

      // 4-second polite gap between calls
      if (i < leadsToCall.length - 1 && !stopBatchRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }
    }

    setBatchCalling(false);
    fetchLeads();
  };

  const handleStopBatch = () => {
    stopBatchRef.current = true;
    setBatchCalling(false);
  };

  // SMS Handler
  const handleSendSms = async () => {
    if (!smsBody.trim() || !smsModalLead) return;
    setSmsSending(true);
    try {
      const res = await fetch(`${API_URL}/api/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: smsModalLead.phone_e164 || smsModalLead.phone,
          to: smsModalLead.phone_e164 || smsModalLead.phone,
          body: smsBody,
          message: smsBody,
          firstName: smsModalLead.first_name,
          firmName: smsModalLead.firm_name,
          practiceArea: smsModalLead.practice_area,
          leadId: smsModalLead.id,
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

  // DNC Handler
  const handleMarkDnc = async (lead) => {
    if (!confirm(`Add ${lead.phone_e164} (${lead.first_name}) to Do Not Call?`))
      return;
    try {
      await supabase
        .from("do_not_call")
        .upsert(
          {
            phone: lead.phone_e164,
            reason: "Manual DNC mark from Leads Board",
          },
          { onConflict: "phone" },
        );
      await supabase
        .from("leads")
        .update({
          status: "DO_NOT_CONTACT",
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);
      fetchLeads();
    } catch (err) {
      alert(`Error updating DNC: ${err.message}`);
    }
  };

  // Restore from DNC
  const handleRestoreFromDnc = async (lead) => {
    try {
      await supabase.from("do_not_call").delete().eq("phone", lead.phone_e164);
      await supabase
        .from("leads")
        .update({ status: "FOLLOW_UP", updated_at: new Date().toISOString() })
        .eq("id", lead.id);
      fetchLeads();
    } catch (err) {
      alert(`Error restoring lead: ${err.message}`);
    }
  };

  // Categorize leads into 4 Clean Tabs
  const needCallingLeads = allLeads.filter(
    (l) =>
      !["DO_NOT_CONTACT", "WRONG_PERSON", "INVALID_NUMBER", "BOOKED"].includes(
        l.status,
      ) &&
      (l.status === "READY" ||
        l.status === "NEW" ||
        l.status === "FOLLOW_UP" ||
        (l.attempt_count || 0) < 5),
  );

  const alreadyCalledLeads = allLeads.filter(
    (l) => (l.attempt_count || 0) > 0 && l.status !== "DO_NOT_CONTACT",
  );

  const hotLeads = allLeads.filter((l) =>
    ["INTERESTED", "BOOKED", "CALLBACK_REQUESTED", "REPLIED"].includes(
      l.status,
    ),
  );

  const dncLeads = allLeads.filter((l) =>
    ["DO_NOT_CONTACT", "WRONG_PERSON", "INVALID_NUMBER"].includes(l.status),
  );

  // Active Tab list
  let currentList = needCallingLeads;
  if (activeTab === "called") currentList = alreadyCalledLeads;
  if (activeTab === "hot") currentList = hotLeads;
  if (activeTab === "dnc") currentList = dncLeads;

  // Filter by search
  const filteredList = currentList.filter((l) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      (l.first_name || "").toLowerCase().includes(term) ||
      (l.last_name || "").toLowerCase().includes(term) ||
      (l.firm_name || "").toLowerCase().includes(term) ||
      (l.phone_e164 || "").includes(term) ||
      (l.city || "").toLowerCase().includes(term) ||
      (l.practice_area_spoken || l.practice_area || "")
        .toLowerCase()
        .includes(term)
    );
  });

  const isAllSelected =
    filteredList.length > 0 && selectedLeadIds.size === filteredList.length;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "20px" }}
      className="animate-fade-in"
    >
      {/* Batch Calling In-Progress Notification */}
      {batchCalling && (
        <div
          className="glass-card"
          style={{
            background:
              "linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)",
            border: "1px solid #00d4ff",
            padding: "16px 20px",
            borderRadius: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 0 25px rgba(0, 212, 255, 0.3)",
            animation: "pulseGlow 2s infinite",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <PhoneCall
              size={24}
              style={{ color: "#00d4ff", animation: "bounce 1s infinite" }}
            />
            <div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "800",
                  color: "#ffffff",
                }}
              >
                ⚡ Calling in Progress: {batchProgress.current} of{" "}
                {batchProgress.total}
              </div>
              <div style={{ fontSize: "12px", color: "#93c5fd" }}>
                Calling now: <strong>{batchProgress.currentName}</strong> (4s
                delay between calls)
              </div>
            </div>
          </div>

          <button
            onClick={handleStopBatch}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#ef4444",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)",
            }}
          >
            <Square size={14} fill="#ffffff" />
            Stop Calling
          </button>
        </div>
      )}

      {/* Main Tabs Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        {/* 4 Clean Tabs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            {
              id: "need_calling",
              label: "📞 Need Calling",
              count: needCallingLeads.length,
              color: "#00d4ff",
            },
            {
              id: "called",
              label: "📋 Already Called / Follow-up",
              count: alreadyCalledLeads.length,
              color: "#c084fc",
            },
            {
              id: "hot",
              label: "🔥 Hot & Meetings",
              count: hotLeads.length,
              color: "#f59e0b",
            },
            {
              id: "dnc",
              label: "🛑 Do Not Call",
              count: dncLeads.length,
              color: "#ef4444",
            },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "10px 18px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: isActive ? "800" : "600",
                  cursor: "pointer",
                  border: isActive
                    ? `1px solid ${tab.color}60`
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  background: isActive
                    ? `${tab.color}20`
                    : "rgba(15, 23, 42, 0.7)",
                  color: isActive ? "#ffffff" : "var(--text-secondary)",
                  boxShadow: isActive ? `0 4px 18px ${tab.color}35` : "none",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "20px",
                    background: isActive
                      ? tab.color
                      : "rgba(255, 255, 255, 0.1)",
                    color: isActive ? "#040914" : "var(--text-primary)",
                    fontWeight: "800",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons & Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {/* Dynamic Call Selected vs Call All Button */}
          {selectedLeadIds.size > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => {
                  const selectedLeads = filteredList.filter((l) =>
                    selectedLeadIds.has(l.id),
                  );
                  handleStartBatchCalling(selectedLeads);
                }}
                disabled={batchCalling}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background:
                    "linear-gradient(135deg, #00d4ff 0%, #0077ff 100%)",
                  color: "#040914",
                  border: "none",
                  borderRadius: "10px",
                  padding: "9px 18px",
                  fontSize: "13px",
                  fontWeight: "800",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(0, 212, 255, 0.4)",
                }}
              >
                <PhoneCall size={14} />
                Call Selected ({selectedLeadIds.size})
              </button>

              <button
                onClick={clearSelection}
                style={{
                  padding: "9px 13px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "var(--text-secondary)",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Clear ({selectedLeadIds.size})
              </button>
            </div>
          ) : (
            activeTab === "need_calling" && (
              <button
                onClick={() => handleStartBatchCalling(filteredList)}
                disabled={batchCalling || filteredList.length === 0}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background:
                    "linear-gradient(135deg, #00d4ff 0%, #0077ff 100%)",
                  color: "#040914",
                  border: "none",
                  borderRadius: "10px",
                  padding: "9px 18px",
                  fontSize: "13px",
                  fontWeight: "800",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(0, 212, 255, 0.35)",
                }}
              >
                <Play size={14} fill="#040914" />
                Call All In This Tab ({filteredList.length})
              </button>
            )
          )}

          {/* Search Input */}
          <div style={{ position: "relative", minWidth: "220px" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search name, firm, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "8px 12px 8px 32px",
                width: "100%",
                fontSize: "12px",
                background: "rgba(10, 16, 30, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                color: "#ffffff",
                outline: "none",
              }}
            />
          </div>

          {/* Refresh */}
          <button
            onClick={fetchLeads}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            <RefreshCw
              size={13}
              className={loading ? "animate-spin" : ""}
              style={{ color: "#00d4ff" }}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div
        className="glass-card"
        style={{ padding: "0", overflow: "hidden", borderRadius: "14px" }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {/* Select All Checkbox */}
                <th
                  style={{
                    width: "46px",
                    padding: "14px 16px",
                    textAlign: "center",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={() => toggleSelectAll(filteredList)}
                    style={{
                      cursor: "pointer",
                      width: "16px",
                      height: "16px",
                      accentColor: "#00d4ff",
                    }}
                    title={isAllSelected ? "Deselect All" : "Select All"}
                  />
                </th>
                <th
                  style={{
                    padding: "14px 20px",
                    color: "var(--text-muted)",
                    fontSize: "11px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                  }}
                >
                  Lead Name & Contact
                </th>
                <th
                  style={{
                    padding: "14px 20px",
                    color: "var(--text-muted)",
                    fontSize: "11px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                  }}
                >
                  Firm & Specialty
                </th>
                <th
                  style={{
                    padding: "14px 20px",
                    color: "var(--text-muted)",
                    fontSize: "11px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                  }}
                >
                  Call Attempts
                </th>
                <th
                  style={{
                    padding: "14px 20px",
                    color: "var(--text-muted)",
                    fontSize: "11px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                  }}
                >
                  Last Activity
                </th>
                <th
                  style={{
                    padding: "14px 20px",
                    color: "var(--text-muted)",
                    fontSize: "11px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    textAlign: "right",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: "50px",
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    <RefreshCw
                      size={26}
                      className="animate-spin"
                      style={{ margin: "0 auto 10px", color: "#00d4ff" }}
                    />
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#ffffff",
                      }}
                    >
                      Loading leads data...
                    </div>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: "50px",
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    <Users
                      size={32}
                      style={{ margin: "0 auto 10px", opacity: 0.4 }}
                    />
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#ffffff",
                      }}
                    >
                      No leads in this tab
                    </div>
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>
                      Search filter reset karein ya leads upload karein.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((lead) => {
                  const attempts = lead.attempt_count || 0;
                  const isSelected = selectedLeadIds.has(lead.id);

                  return (
                    <tr
                      key={lead.id}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                        background: isSelected
                          ? "rgba(0, 212, 255, 0.05)"
                          : "transparent",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected)
                          e.currentTarget.style.background =
                            "rgba(255, 255, 255, 0.02)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected)
                          e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {/* Row Checkbox */}
                      <td
                        style={{
                          width: "46px",
                          padding: "14px 16px",
                          textAlign: "center",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectLead(lead.id)}
                          style={{
                            cursor: "pointer",
                            width: "16px",
                            height: "16px",
                            accentColor: "#00d4ff",
                          }}
                        />
                      </td>

                      {/* Name & Phone */}
                      <td style={{ padding: "14px 20px" }}>
                        <div
                          style={{
                            fontWeight: "700",
                            color: "#ffffff",
                            fontSize: "14px",
                          }}
                        >
                          {lead.first_name} {lead.last_name || ""}
                        </div>
                        <div
                          style={{
                            color: "#00d4ff",
                            fontSize: "12px",
                            marginTop: "2px",
                            fontFamily: "monospace",
                          }}
                        >
                          {lead.phone_e164}
                        </div>
                      </td>

                      {/* Firm & Specialty */}
                      <td style={{ padding: "14px 20px" }}>
                        <div
                          style={{
                            fontWeight: "600",
                            color: "#ffffff",
                            fontSize: "13px",
                          }}
                        >
                          {lead.firm_name || lead.company_name || "Law Office"}
                        </div>
                        <div
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "12px",
                            marginTop: "2px",
                          }}
                        >
                          {lead.practice_area_spoken ||
                            lead.practice_area ||
                            "Attorney"}
                        </div>
                      </td>

                      {/* Call Attempts */}
                      <td style={{ padding: "14px 20px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "700",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background:
                                attempts > 0
                                  ? "rgba(192, 132, 252, 0.15)"
                                  : "rgba(0, 212, 255, 0.15)",
                              color: attempts > 0 ? "#c084fc" : "#00d4ff",
                              border: `1px solid ${attempts > 0 ? "rgba(192, 132, 252, 0.3)" : "rgba(0, 212, 255, 0.3)"}`,
                            }}
                          >
                            {attempts === 0
                              ? "0 Dials (Fresh)"
                              : `${attempts} Dials Made`}
                          </span>
                        </div>
                      </td>

                      {/* Last Activity */}
                      <td style={{ padding: "14px 20px" }}>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--text-primary)",
                            fontWeight: "600",
                          }}
                        >
                          {lead.last_called_at
                            ? new Date(lead.last_called_at).toLocaleDateString(
                                [],
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : "Not called yet"}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            marginTop: "2px",
                          }}
                        >
                          Status:{" "}
                          <span style={{ color: "#ffffff", fontWeight: "600" }}>
                            {lead.status}
                          </span>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "8px",
                          }}
                        >
                          {/* 📞 Call Now Button */}
                          <button
                            onClick={() => handleManualCall(lead)}
                            disabled={actionLoading === lead.id || batchCalling}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              background: "rgba(0, 212, 255, 0.15)",
                              border: "1px solid rgba(0, 212, 255, 0.4)",
                              color: "#00d4ff",
                              borderRadius: "8px",
                              padding: "6px 12px",
                              fontSize: "12px",
                              fontWeight: "700",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#00d4ff";
                              e.currentTarget.style.color = "#040914";
                              e.currentTarget.style.boxShadow =
                                "0 0 14px rgba(0, 212, 255, 0.5)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background =
                                "rgba(0, 212, 255, 0.15)";
                              e.currentTarget.style.color = "#00d4ff";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                            title="Call this lead now"
                          >
                            <Phone size={13} />
                            {actionLoading === lead.id
                              ? "Calling..."
                              : "Call Now"}
                          </button>

                          {/* 💬 Quick SMS Button */}
                          <button
                            onClick={() => {
                              setSmsModalLead(lead);
                              setSmsBody(
                                `Hi ${lead.first_name}, Alexa here from AI Search Engineers. Just wanted to share our quick ChatGPT audit for ${lead.firm_name}. Worth a quick 5-min chat?`,
                              );
                            }}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "8px",
                              background: "rgba(56, 189, 248, 0.1)",
                              border: "1px solid rgba(56, 189, 248, 0.25)",
                              color: "#38bdf8",
                              cursor: "pointer",
                              fontSize: "12px",
                              display: "flex",
                              alignItems: "center",
                            }}
                            title="Send SMS"
                          >
                            <MessageSquare size={13} />
                          </button>

                          {/* 🛑 DNC Button / Restore Button */}
                          {activeTab === "dnc" ? (
                            <button
                              onClick={() => handleRestoreFromDnc(lead)}
                              style={{
                                padding: "6px 10px",
                                borderRadius: "8px",
                                background: "rgba(16, 185, 129, 0.15)",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                color: "#34d399",
                                cursor: "pointer",
                                fontSize: "11px",
                                fontWeight: "700",
                              }}
                              title="Restore lead"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarkDnc(lead)}
                              style={{
                                padding: "6px 10px",
                                borderRadius: "8px",
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.25)",
                                color: "#ef4444",
                                cursor: "pointer",
                                fontSize: "12px",
                                display: "flex",
                                alignItems: "center",
                              }}
                              title="Mark Do Not Call"
                            >
                              <ShieldAlert size={13} />
                            </button>
                          )}
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
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            className="glass-card"
            style={{
              width: "460px",
              maxWidth: "90%",
              padding: "24px",
              border: "1px solid rgba(0, 212, 255, 0.3)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)",
            }}
          >
            <h3
              style={{
                fontSize: "17px",
                fontWeight: "700",
                color: "#ffffff",
                marginBottom: "4px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Send size={16} style={{ color: "#00d4ff" }} />
              Send SMS to {smsModalLead.first_name}
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                marginBottom: "14px",
              }}
            >
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
                marginBottom: "14px",
                outline: "none",
              }}
              placeholder="Type your SMS message..."
            />

            {smsSuccess && (
              <div
                style={{
                  color: "#10b981",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <CheckCircle2 size={15} /> SMS sent successfully!
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
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
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendSms}
                disabled={smsSending || !smsBody.trim()}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  background:
                    "linear-gradient(135deg, #00d4ff 0%, #0077ff 100%)",
                  border: "none",
                  color: "#040914",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "700",
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
