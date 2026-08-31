import { useState, useEffect } from "react";
import supabase from "../supabase";

const API_URL = import.meta.env.DEV
  ? "http://localhost:3000"
  : import.meta.env.VITE_API_URL || "https://aise-cold-caller.onrender.com";

export default function VoicemailRetries() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending"); // pending, voicemail, exhausted, all
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [batchLimit, setBatchLimit] = useState(25);
  const [recampaigning, setRecampaigning] = useState(false);
  const [callingSingleId, setCallingSingleId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  // SMS modal state
  const [smsModalLead, setSmsModalLead] = useState(null);
  const [smsMessage, setSmsMessage] = useState("");
  const [sendingSms, setSendingSms] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/retries/all`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads || []);
      } else {
        // Fallback directly to Supabase if endpoint fails
        const { data: sbData } = await supabase
          .from("retry_leads")
          .select("*")
          .order("last_called_at", { ascending: false });
        setLeads(sbData || []);
      }
    } catch (err) {
      console.error("Error fetching retry leads:", err);
      const { data: sbData } = await supabase
        .from("retry_leads")
        .select("*")
        .order("last_called_at", { ascending: false });
      setLeads(sbData || []);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg, type = "success") => {
    setStatusMessage({ text: msg, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Re-campaign pending leads (with batch limit)
  const handleRecampaignAll = async () => {
    if (pendingLeadsCount === 0) {
      showNotification("No pending leads available for re-campaign", "error");
      return;
    }

    const targetCount = Math.min(pendingLeadsCount, Number(batchLimit));

    if (
      !confirm(
        `Are you sure you want to re-campaign ${targetCount} pending lead(s) with a ${delaySeconds}s delay between calls?`,
      )
    ) {
      return;
    }

    setRecampaigning(true);
    try {
      const res = await fetch(`${API_URL}/api/retries/call-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delaySeconds: Number(delaySeconds),
          limit: Number(batchLimit),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(
          `🚀 Campaign launched! ${data.retried} lead(s) queued for re-calling into background queue.`,
          "success",
        );
        fetchLeads();
      } else {
        showNotification(data.error || "Failed to launch re-campaign", "error");
      }
    } catch (err) {
      showNotification("Failed to connect to server: " + err.message, "error");
    } finally {
      setRecampaigning(false);
    }
  };

  // Select top N leads in current view
  const handleSelectTopCount = (count) => {
    const topIds = filteredLeads.slice(0, count).map((l) => l.id);
    setSelectedIds(topIds);
    showNotification(`Selected top ${topIds.length} lead(s)`, "success");
  };

  // Re-campaign selected leads
  const handleRecampaignSelected = async () => {
    if (selectedIds.length === 0) return;

    if (!confirm(`Re-campaign ${selectedIds.length} selected lead(s)?`)) return;

    setRecampaigning(true);
    try {
      const res = await fetch(`${API_URL}/api/retries/call-selected`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: selectedIds,
          delaySeconds: Number(delaySeconds),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(
          `🚀 Queued ${data.retried} selected lead(s) for re-calling!`,
          "success",
        );
        setSelectedIds([]);
        fetchLeads();
      } else {
        showNotification(
          data.error || "Failed to queue selected leads",
          "error",
        );
      }
    } catch (err) {
      showNotification("Error queuing selected leads: " + err.message, "error");
    } finally {
      setRecampaigning(false);
    }
  };

  // Single Call Now
  const handleCallSingle = async (lead) => {
    setCallingSingleId(lead.id);
    try {
      const res = await fetch(`${API_URL}/api/retries/call/${lead.id}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        showNotification(
          `📞 Call initiated to ${lead.phone} (${data.status})`,
          "success",
        );
        fetchLeads();
      } else {
        showNotification(data.error || "Call failed", "error");
      }
    } catch (err) {
      showNotification("Error placing call: " + err.message, "error");
    } finally {
      setCallingSingleId(null);
    }
  };

  // Delete/Dismiss Lead
  const handleDeleteLead = async (id) => {
    if (!confirm("Remove this lead from retry list?")) return;
    try {
      await fetch(`${API_URL}/api/retries/${id}`, { method: "DELETE" });
      setLeads(leads.filter((l) => l.id !== id));
      setSelectedIds(selectedIds.filter((sId) => sId !== id));
      showNotification("Lead removed from retries", "success");
    } catch (err) {
      showNotification("Failed to remove lead", "error");
    }
  };

  // Open SMS Modal
  const handleOpenSmsModal = (lead) => {
    setSmsModalLead(lead);
    setSmsMessage(
      `Hi ${lead.first_name || "there"}, I tried calling you regarding your practice at ${lead.firm_name || lead.company_name || "your firm"}. When is a good time to connect?`,
    );
  };

  // Send Manual SMS
  const handleSendSms = async () => {
    if (!smsModalLead || !smsMessage.trim()) return;
    setSendingSms(true);
    try {
      const res = await fetch(`${API_URL}/api/send-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: smsModalLead.phone,
          message: smsMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`💬 SMS sent to ${smsModalLead.phone}!`, "success");
        setSmsModalLead(null);
      } else {
        showNotification(data.error || "Failed to send SMS", "error");
      }
    } catch (err) {
      showNotification("Failed to send SMS: " + err.message, "error");
    } finally {
      setSendingSms(false);
    }
  };

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredLeads.map((l) => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((sId) => sId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Calculated Stats
  const voicemailCount = leads.filter((l) =>
    (l.last_outcome || "").toLowerCase().includes("voicemail"),
  ).length;
  const pendingLeadsCount = leads.filter((l) => l.status === "pending").length;
  const exhaustedCount = leads.filter(
    (l) => l.status === "exhausted" || l.attempt_count >= 3,
  ).length;

  // Filtered Leads
  const filteredLeads = leads.filter((l) => {
    const outcome = (l.last_outcome || "").toLowerCase();
    const status = l.status || "pending";

    let matchesFilter = true;
    if (filter === "pending") matchesFilter = status === "pending";
    else if (filter === "voicemail")
      matchesFilter = outcome.includes("voicemail");
    else if (filter === "exhausted")
      matchesFilter = status === "exhausted" || l.attempt_count >= 3;

    const searchTerm = search.toLowerCase();
    const matchesSearch =
      !search ||
      (l.first_name || "").toLowerCase().includes(searchTerm) ||
      (l.last_name || "").toLowerCase().includes(searchTerm) ||
      (l.phone || "").includes(searchTerm) ||
      (l.company_name || "").toLowerCase().includes(searchTerm) ||
      (l.firm_name || "").toLowerCase().includes(searchTerm) ||
      (l.city || "").toLowerCase().includes(searchTerm);

    return matchesFilter && matchesSearch;
  });

  const getOutcomeBadgeStyle = (outcomeStr) => {
    const o = (outcomeStr || "").toLowerCase();
    if (o.includes("voicemail")) {
      return {
        bg: "rgba(255, 170, 0, 0.15)",
        color: "#ffaa00",
        border: "rgba(255, 170, 0, 0.3)",
      };
    }
    if (o.includes("no-answer") || o.includes("did-not-answer")) {
      return {
        bg: "rgba(0, 212, 255, 0.15)",
        color: "#00d4ff",
        border: "rgba(0, 212, 255, 0.3)",
      };
    }
    if (o.includes("busy")) {
      return {
        bg: "rgba(168, 85, 247, 0.15)",
        color: "#c084fc",
        border: "rgba(168, 85, 247, 0.3)",
      };
    }
    return {
      bg: "rgba(255, 255, 255, 0.1)",
      color: "var(--text-secondary)",
      border: "var(--border)",
    };
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
        }}
      >
        <div
          style={{
            color: "var(--accent)",
            fontFamily: "var(--font-display)",
            fontSize: "18px",
          }}
        >
          Loading Voicemail & Retry Leads...
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Status Notification Toast */}
      {statusMessage && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 999,
            padding: "14px 20px",
            borderRadius: "12px",
            background:
              statusMessage.type === "error"
                ? "rgba(255, 71, 87, 0.9)"
                : "rgba(0, 255, 148, 0.9)",
            color: statusMessage.type === "error" ? "#fff" : "#070b14",
            fontWeight: "600",
            fontFamily: "var(--font-body)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {statusMessage.type === "error" ? "⚠️" : "✨"} {statusMessage.text}
        </div>
      )}

      {/* Header & Page Title */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "28px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "30px",
              fontWeight: "800",
              marginBottom: "6px",
              background:
                "linear-gradient(135deg, #ffffff 0%, var(--accent) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            📬 Voicemail & Retry Campaigns
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Track unanswered calls and launch automated re-calling campaigns for
            leads that went to voicemail.
          </p>
        </div>

        {/* Action Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {/* Batch Size Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--bg-card)",
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Batch Limit:
            </span>
            <select
              value={batchLimit}
              onChange={(e) => setBatchLimit(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent)",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="25" style={{ background: "var(--bg-card)" }}>
                25 Leads
              </option>
              <option value="10" style={{ background: "var(--bg-card)" }}>
                10 Leads
              </option>
              <option value="50" style={{ background: "var(--bg-card)" }}>
                50 Leads
              </option>
              <option value="100" style={{ background: "var(--bg-card)" }}>
                100 Leads
              </option>
            </select>
          </div>

          {/* Delay Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--bg-card)",
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Delay:
            </span>
            <select
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent)",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="5" style={{ background: "var(--bg-card)" }}>
                5 Seconds
              </option>
              <option value="10" style={{ background: "var(--bg-card)" }}>
                10 Seconds
              </option>
              <option value="15" style={{ background: "var(--bg-card)" }}>
                15 Seconds
              </option>
              <option value="30" style={{ background: "var(--bg-card)" }}>
                30 Seconds
              </option>
            </select>
          </div>

          {selectedIds.length > 0 ? (
            <button
              onClick={handleRecampaignSelected}
              disabled={recampaigning}
              style={{
                padding: "10px 20px",
                background: "var(--accent)",
                color: "#070b14",
                border: "none",
                borderRadius: "10px",
                fontFamily: "var(--font-body)",
                fontWeight: "700",
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 0 20px var(--accent-dim)",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              🚀{" "}
              {recampaigning
                ? "Queueing..."
                : `Re-Campaign Selected (${selectedIds.length})`}
            </button>
          ) : (
            <button
              onClick={handleRecampaignAll}
              disabled={recampaigning || pendingLeadsCount === 0}
              style={{
                padding: "10px 20px",
                background:
                  pendingLeadsCount > 0
                    ? "linear-gradient(135deg, var(--accent) 0%, #00a3ff 100%)"
                    : "var(--bg-hover)",
                color: pendingLeadsCount > 0 ? "#070b14" : "var(--text-muted)",
                border: "none",
                borderRadius: "10px",
                fontFamily: "var(--font-body)",
                fontWeight: "700",
                fontSize: "14px",
                cursor: pendingLeadsCount > 0 ? "pointer" : "not-allowed",
                boxShadow:
                  pendingLeadsCount > 0
                    ? "0 4px 20px var(--accent-dim)"
                    : "none",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              🚀{" "}
              {recampaigning
                ? "Queueing Campaign..."
                : `Re-Campaign Batch (${Math.min(pendingLeadsCount, batchLimit)})`}
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              color: "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: "500",
            }}
          >
            Total Retries Recorded
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: "800",
              fontFamily: "var(--font-display)",
              color: "var(--text-primary)",
            }}
          >
            {leads.length}
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(255, 170, 0, 0.2)",
            borderRadius: "16px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{ color: "#ffaa00", fontSize: "13px", fontWeight: "500" }}
          >
            Voicemail Detection
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: "800",
              fontFamily: "var(--font-display)",
              color: "#ffaa00",
            }}
          >
            {voicemailCount}
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-hover)",
            borderRadius: "16px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              color: "var(--accent)",
              fontSize: "13px",
              fontWeight: "500",
            }}
          >
            Pending Re-Campaign
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: "800",
              fontFamily: "var(--font-display)",
              color: "var(--accent)",
            }}
          >
            {pendingLeadsCount}
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(255, 71, 87, 0.2)",
            borderRadius: "16px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              color: "var(--accent-red)",
              fontSize: "13px",
              fontWeight: "500",
            }}
          >
            Exhausted Leads (3+ Calls)
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: "800",
              fontFamily: "var(--font-display)",
              color: "var(--accent-red)",
            }}
          >
            {exhaustedCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        {/* Filter Tabs */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-card)",
            padding: "4px",
            borderRadius: "12px",
            border: "1px solid var(--border)",
          }}
        >
          {[
            { id: "pending", label: `Pending (${pendingLeadsCount})` },
            { id: "voicemail", label: `Voicemail (${voicemailCount})` },
            { id: "exhausted", label: `Exhausted (${exhaustedCount})` },
            { id: "all", label: `All (${leads.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                background:
                  filter === tab.id ? "var(--bg-hover)" : "transparent",
                color:
                  filter === tab.id ? "var(--accent)" : "var(--text-secondary)",
                fontSize: "13px",
                fontFamily: "var(--font-body)",
                fontWeight: filter === tab.id ? "600" : "400",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Quick Select Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => handleSelectTopCount(25)}
            style={{
              padding: "8px 12px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-hover)",
              color: "var(--accent)",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            ☑️ Select Top 25
          </button>
          <button
            onClick={() => handleSelectTopCount(10)}
            style={{
              padding: "8px 12px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              borderRadius: "8px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            ☑️ Select Top 10
          </button>
          {selectedIds.length > 0 && (
            <button
              onClick={() => setSelectedIds([])}
              style={{
                padding: "8px 12px",
                background: "transparent",
                border: "1px solid rgba(255, 71, 87, 0.3)",
                color: "var(--accent-red)",
                borderRadius: "8px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Clear ({selectedIds.length})
            </button>
          )}
        </div>

        {/* Search input */}
        <div style={{ minWidth: "240px", flex: 1, maxWidth: "350px" }}>
          <input
            type="text"
            placeholder="Search by lead name, phone, firm, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 16px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontFamily: "var(--font-body)",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Main Table Card */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        }}
      >
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
                background: "var(--bg-secondary)",
                borderBottom: "1px solid var(--border)",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "1px",
                color: "var(--text-secondary)",
              }}
            >
              <th style={{ padding: "16px 20px", width: "40px" }}>
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={
                    filteredLeads.length > 0 &&
                    selectedIds.length === filteredLeads.length
                  }
                  style={{ cursor: "pointer" }}
                />
              </th>
              <th style={{ padding: "16px 20px" }}>Lead Details</th>
              <th style={{ padding: "16px 20px" }}>Firm / Company</th>
              <th style={{ padding: "16px 20px" }}>Last Outcome</th>
              <th style={{ padding: "16px 20px" }}>Attempts</th>
              <th style={{ padding: "16px 20px" }}>Last Called</th>
              <th style={{ padding: "16px 20px", textAlign: "right" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: "48px 20px",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    fontSize: "14px",
                  }}
                >
                  No retry leads found in this view.
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = selectedIds.includes(lead.id);
                const styleObj = getOutcomeBadgeStyle(lead.last_outcome);

                return (
                  <tr
                    key={lead.id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: isSelected
                        ? "var(--accent-dim)"
                        : "transparent",
                      transition: "background 0.15s",
                    }}
                  >
                    <td style={{ padding: "16px 20px" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(lead.id)}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <div
                        style={{
                          fontWeight: "600",
                          fontSize: "14px",
                          color: "var(--text-primary)",
                        }}
                      >
                        {lead.first_name || "Unknown"} {lead.last_name || ""}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "var(--accent)",
                          fontFamily: "monospace",
                        }}
                      >
                        {lead.phone}
                      </div>
                      {lead.designation && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                            marginTop: "2px",
                          }}
                        >
                          {lead.designation}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "var(--text-primary)",
                        }}
                      >
                        {lead.firm_name || lead.company_name || "-"}
                      </div>
                      {lead.city && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          📍 {lead.city}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                          background: styleObj.bg,
                          color: styleObj.color,
                          border: `1px solid ${styleObj.border}`,
                        }}
                      >
                        {lead.last_outcome || "no-answer"}
                      </span>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "700",
                          background:
                            lead.attempt_count >= 3
                              ? "rgba(255, 71, 87, 0.15)"
                              : "var(--bg-secondary)",
                          color:
                            lead.attempt_count >= 3
                              ? "var(--accent-red)"
                              : "var(--text-secondary)",
                          border:
                            lead.attempt_count >= 3
                              ? "1px solid rgba(255, 71, 87, 0.3)"
                              : "1px solid var(--border)",
                        }}
                      >
                        {lead.attempt_count || 1} / 3 Attempts
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "16px 20px",
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {lead.last_called_at
                        ? new Date(lead.last_called_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Not recorded"}
                    </td>
                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: "8px",
                        }}
                      >
                        <button
                          onClick={() => handleCallSingle(lead)}
                          disabled={callingSingleId === lead.id}
                          title="Call Now (Single Retry)"
                          style={{
                            padding: "6px 12px",
                            background: "var(--accent-dim)",
                            border: "1px solid var(--border-hover)",
                            color: "var(--accent)",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                        >
                          {callingSingleId === lead.id
                            ? "Calling..."
                            : "📞 Call Now"}
                        </button>
                        <button
                          onClick={() => handleOpenSmsModal(lead)}
                          title="Send SMS"
                          style={{
                            padding: "6px 10px",
                            background: "var(--bg-secondary)",
                            border: "1px solid var(--border)",
                            color: "var(--text-primary)",
                            borderRadius: "8px",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          💬 SMS
                        </button>
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          title="Remove Lead"
                          style={{
                            padding: "6px 10px",
                            background: "transparent",
                            border: "1px solid rgba(255, 71, 87, 0.2)",
                            color: "var(--accent-red)",
                            borderRadius: "8px",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          🗑️
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

      {/* Manual SMS Modal */}
      {smsModalLead && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-hover)",
              borderRadius: "16px",
              padding: "28px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "18px",
                fontWeight: "700",
                marginBottom: "6px",
              }}
            >
              Send SMS to {smsModalLead.first_name || smsModalLead.phone}
            </h3>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              Recipient:{" "}
              <span style={{ color: "var(--accent)", fontFamily: "monospace" }}>
                {smsModalLead.phone}
              </span>
            </p>

            <textarea
              rows={4}
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                outline: "none",
                marginBottom: "20px",
                resize: "vertical",
              }}
            />

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
                  padding: "10px 16px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  borderRadius: "10px",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendSms}
                disabled={sendingSms}
                style={{
                  padding: "10px 20px",
                  background: "var(--accent)",
                  color: "#070b14",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                {sendingSms ? "Sending..." : "Send SMS Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
