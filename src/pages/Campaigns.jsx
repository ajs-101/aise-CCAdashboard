import { useState, useRef } from "react";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "https://aise-cold-caller.onrender.com";

export default function Campaigns() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const isSubmittingRef = useRef(false);

  const [delaySeconds, setDelaySeconds] = useState(5);
  const [respectHours, setRespectHours] = useState(true);

  const [testPhone, setTestPhone] = useState("");
  const [testName, setTestName] = useState("");
  const [testPractice, setTestPractice] = useState("");
  const [testCity, setTestCity] = useState("");
  const [testDesignation, setTestDesignation] = useState("");
  const [testCompany, setTestCompany] = useState("");
  const [testCalling, setTestCalling] = useState(false);
  const [testResult, setTestResult] = useState("");

  const handleTestCall = async () => {
    if (testCalling) return;
    if (!testPhone) return setTestResult("Phone number is required");
    if (!testPhone.startsWith("+"))
      return setTestResult("Phone must start with + and country code");
    setTestCalling(true);
    setTestResult("");
    try {
      const res = await axios.post(API_URL + "/make-call", {
        phone: testPhone,
        firstName: testName || "there",
        designation: testDesignation || "",
        companyName: testCompany || "",
        practiceArea: testPractice || "attorney",
        city: testCity || "your area",
      });
      if (res.data.status === "queued") {
        setTestResult(
          "✅ Call queued successfully — phone should ring shortly!",
        );
      } else {
        setTestResult(
          "Status: " + (res.data.status || JSON.stringify(res.data)),
        );
      }
    } catch (err) {
      setTestResult("❌ Failed to make call. Make sure backend is running.");
    }
    setTestCalling(false);
  };

  const handleFileChange = function (e) {
    const selected = e.target.files[0];
    if (selected && selected.name.endsWith(".csv")) {
      setFile(selected);
      setError("");
      setResults(null);
    } else {
      setError("Please upload a CSV file only");
    }
  };

  const handleDrop = function (e) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith(".csv")) {
      setFile(dropped);
      setError("");
      setResults(null);
    } else {
      setError("Please upload a CSV file only");
    }
  };

  const startCampaignConfirmed = async () => {
    if (!file || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setShowConfirmModal(false);
    setUploading(true);
    setResults(null);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("delaySeconds", delaySeconds);
    formData.append("respectHours", respectHours);

    try {
      const res = await axios.post(API_URL + "/api/upload-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success === false) {
        setError(res.data.error || "Campaign failed");
      } else {
        setResults(res.data);
        // Clear file from state to prevent accidental repeat clicks
        setFile(null);
        const fileInput = document.getElementById("csv-input");
        if (fileInput) fileInput.value = "";
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to upload. Make sure the backend is running.",
      );
    } finally {
      setUploading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleUploadClick = () => {
    if (!file || uploading || isSubmittingRef.current) return;
    setError("");
    setShowConfirmModal(true);
  };

  const resetAll = () => {
    setFile(null);
    setResults(null);
    setError("");
    const fileInput = document.getElementById("csv-input");
    if (fileInput) fileInput.value = "";
  };

  var getStatusColor = function (status) {
    if (status === "queued") return "var(--accent-green)";
    if (status === "failed") return "var(--accent-red)";
    if (status === "dnc-blocked") return "var(--accent-red)";
    if (status === "skipped" || status === "stopped-outside-hours")
      return "var(--accent-yellow)";
    return "var(--accent)";
  };

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "28px",
            fontWeight: "800",
            marginBottom: "4px",
          }}
        >
          Campaigns
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Test a single call or upload a CSV to start a campaign
        </p>
      </div>

      {/* Test Single Call */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "15px",
            fontWeight: "700",
            marginBottom: "16px",
            color: "var(--accent)",
          }}
        >
          Test Single Call
        </h3>
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "12px",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            placeholder="+12125551234"
            value={testPhone}
            onChange={function (e) {
              setTestPhone(e.target.value);
            }}
            style={{
              flex: "1 1 150px",
              padding: "10px 16px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontFamily: "var(--font-body)",
              outline: "none",
            }}
          />
          <input
            type="text"
            placeholder="First name"
            value={testName}
            onChange={function (e) {
              setTestName(e.target.value);
            }}
            style={{
              flex: "1 1 120px",
              padding: "10px 16px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontFamily: "var(--font-body)",
              outline: "none",
            }}
          />
          <input
            type="text"
            placeholder="Designation"
            value={testDesignation}
            onChange={function (e) {
              setTestDesignation(e.target.value);
            }}
            style={{
              flex: "1 1 130px",
              padding: "10px 16px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontFamily: "var(--font-body)",
              outline: "none",
            }}
          />
          <input
            type="text"
            placeholder="Company name"
            value={testCompany}
            onChange={function (e) {
              setTestCompany(e.target.value);
            }}
            style={{
              flex: "1 1 140px",
              padding: "10px 16px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontFamily: "var(--font-body)",
              outline: "none",
            }}
          />
          <input
            type="text"
            placeholder="Practice area"
            value={testPractice}
            onChange={function (e) {
              setTestPractice(e.target.value);
            }}
            style={{
              flex: "1 1 140px",
              padding: "10px 16px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontFamily: "var(--font-body)",
              outline: "none",
            }}
          />
          <input
            type="text"
            placeholder="City"
            value={testCity}
            onChange={function (e) {
              setTestCity(e.target.value);
            }}
            style={{
              flex: "1 1 120px",
              padding: "10px 16px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontFamily: "var(--font-body)",
              outline: "none",
            }}
          />
          <button
            onClick={handleTestCall}
            disabled={testCalling}
            style={{
              padding: "10px 24px",
              background: testCalling ? "var(--accent-dim)" : "var(--accent)",
              border: "none",
              borderRadius: "10px",
              color: testCalling ? "var(--accent)" : "#070b14",
              fontSize: "14px",
              fontWeight: "700",
              fontFamily: "var(--font-display)",
              cursor: testCalling ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {testCalling ? "Calling..." : "Call Now"}
          </button>
        </div>
        {testResult ? (
          <p
            style={{
              fontSize: "13px",
              color: testResult.includes("✅")
                ? "var(--accent-green)"
                : "var(--accent-red)",
              marginTop: "8px",
            }}
          >
            {testResult}
          </p>
        ) : null}
      </div>

      {/* Campaign Settings */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "15px",
            fontWeight: "700",
            marginBottom: "16px",
            color: "var(--accent)",
          }}
        >
          Campaign Settings
        </h3>
        <div
          style={{
            display: "flex",
            gap: "24px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                color: "var(--text-secondary)",
                marginBottom: "6px",
              }}
            >
              Delay between calls (seconds)
            </label>
            <input
              type="number"
              min="2"
              max="300"
              value={delaySeconds}
              onChange={function (e) {
                setDelaySeconds(e.target.value);
              }}
              style={{
                width: "120px",
                padding: "10px 16px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                color: "var(--text-primary)",
                fontSize: "14px",
                fontFamily: "var(--font-body)",
                outline: "none",
              }}
            />
          </div>
          <div
            onClick={function () {
              setRespectHours(!respectHours);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              marginTop: "18px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "22px",
                borderRadius: "20px",
                background: respectHours
                  ? "var(--accent)"
                  : "var(--bg-secondary)",
                border: "1px solid var(--border)",
                position: "relative",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: respectHours ? "#070b14" : "var(--text-muted)",
                  position: "absolute",
                  top: "2px",
                  left: respectHours ? "20px" : "3px",
                  transition: "all 0.2s",
                }}
              />
            </div>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Only call during US business hours (9am–5pm EST, Mon–Fri)
            </span>
          </div>
        </div>
      </div>

      {/* CSV Format guide */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "20px 24px",
          marginBottom: "24px",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "14px",
            fontWeight: "700",
            marginBottom: "12px",
            color: "var(--accent)",
          }}
        >
          CSV Format Required
        </h3>
        <code
          style={{
            display: "block",
            background: "var(--bg-secondary)",
            padding: "12px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            color: "var(--accent-green)",
            fontFamily: "monospace",
            lineHeight: "1.6",
          }}
        >
          phone,firstName,lastName,designation,companyName,firmName,practiceArea,city
          <br />
          +12125551234,John,Smith,Managing Partner,Smith & Associates,Smith
          Law,Estate Planning,New York
        </code>
      </div>

      {/* Upload area */}
      <div
        onDragOver={function (e) {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={function () {
          setDragOver(false);
        }}
        onDrop={handleDrop}
        style={{
          background: dragOver ? "var(--accent-dim)" : "var(--bg-card)",
          border:
            "2px dashed " + (dragOver ? "var(--accent)" : "var(--border)"),
          borderRadius: "16px",
          padding: "48px",
          textAlign: "center",
          marginBottom: "24px",
          transition: "all 0.2s",
          cursor: "pointer",
        }}
        onClick={function () {
          document.getElementById("csv-input").click();
        }}
      >
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>📂</div>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "16px",
            fontWeight: "700",
            marginBottom: "8px",
          }}
        >
          {file ? file.name : "Drop your CSV here or click to browse"}
        </p>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
          {file
            ? (file.size / 1024).toFixed(1) + " KB ready to upload"
            : "Supports .csv files only"}
        </p>
      </div>

      {error ? (
        <div
          style={{
            background: "rgba(255,71,87,0.1)",
            border: "1px solid var(--accent-red)",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "16px",
            color: "var(--accent-red)",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "32px" }}>
        <button
          onClick={handleUploadClick}
          disabled={!file || uploading}
          style={{
            padding: "14px 32px",
            background:
              !file || uploading ? "var(--accent-dim)" : "var(--accent)",
            border: "none",
            borderRadius: "10px",
            color: !file || uploading ? "var(--accent)" : "#070b14",
            fontSize: "14px",
            fontWeight: "700",
            fontFamily: "var(--font-display)",
            cursor: !file || uploading ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {uploading ? (
            <>
              <span
                style={{
                  display: "inline-block",
                  width: "14px",
                  height: "14px",
                  border: "2px solid currentColor",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Queuing campaign...
            </>
          ) : (
            "🚀 Start Campaign"
          )}
        </button>

        {results ? (
          <button
            onClick={resetAll}
            style={{
              padding: "14px 24px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            ➕ Start New Campaign
          </button>
        ) : null}
      </div>

      {results ? (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "16px",
                fontWeight: "700",
              }}
            >
              Campaign Dispatch Summary
            </h2>
            <span
              style={{
                background: "var(--accent-dim)",
                color: "var(--accent)",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {results.total} leads · {results.queued || results.called || 0}{" "}
              queued · {results.blocked || 0} blocked
            </span>
          </div>
          {results.message ? (
            <div
              style={{
                padding: "12px 24px",
                background: "rgba(0, 230, 153, 0.1)",
                color: "var(--accent-green)",
                fontSize: "13px",
                fontWeight: "600",
                borderBottom: "1px solid var(--border)",
              }}
            >
              ⚡ {results.message}
            </div>
          ) : null}
          {results.results && results.results.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary)" }}>
                  {["Name", "Phone", "Call ID", "Status"].map(function (h) {
                    return (
                      <th
                        key={h}
                        style={{
                          padding: "12px 24px",
                          textAlign: "left",
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {h}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {results.results.map(function (r, i) {
                  return (
                    <tr
                      key={i}
                      style={{
                        borderTop: "1px solid var(--border)",
                        background:
                          i % 2 === 0
                            ? "transparent"
                            : "rgba(255,255,255,0.01)",
                      }}
                    >
                      <td
                        style={{
                          padding: "14px 24px",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        {r.firstName || "—"}
                      </td>
                      <td
                        style={{
                          padding: "14px 24px",
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {r.phone}
                      </td>
                      <td
                        style={{
                          padding: "14px 24px",
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          fontFamily: "monospace",
                        }}
                      >
                        {r.callId ? r.callId.substring(0, 16) + "..." : "—"}
                      </td>
                      <td style={{ padding: "14px 24px" }}>
                        <span
                          style={{
                            fontSize: "12px",
                            padding: "4px 10px",
                            borderRadius: "20px",
                            background: getStatusColor(r.status) + "20",
                            color: getStatusColor(r.status),
                            fontWeight: "500",
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </div>
      ) : null}

      {/* Confirmation Modal to Prevent Double-Calling */}
      {showConfirmModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#0d131f",
              border: "1px solid var(--border)",
              borderRadius: "20px",
              padding: "28px",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "rgba(0, 230, 153, 0.15)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                }}
              >
                📞
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "18px",
                    fontWeight: "800",
                    color: "#fff",
                    margin: 0,
                  }}
                >
                  Start Outbound Campaign?
                </h3>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    margin: 0,
                  }}
                >
                  Please confirm before dispatching live calls
                </p>
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "20px",
                fontSize: "13px",
                lineHeight: "1.6",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>File:</span>
                <span
                  style={{
                    fontWeight: "600",
                    color: "var(--text-primary)",
                    fontFamily: "monospace",
                  }}
                >
                  {file?.name}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  Call Delay:
                </span>
                <span
                  style={{ fontWeight: "600", color: "var(--accent-green)" }}
                >
                  {delaySeconds} seconds between calls
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  US Hours Check:
                </span>
                <span
                  style={{
                    fontWeight: "600",
                    color: respectHours
                      ? "var(--accent)"
                      : "var(--accent-yellow)",
                  }}
                >
                  {respectHours ? "Enforced (9am-5pm EST)" : "Disabled (Call anytime)"}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={uploading}
                style={{
                  padding: "10px 18px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  color: "var(--text-secondary)",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={startCampaignConfirmed}
                disabled={uploading}
                style={{
                  padding: "10px 22px",
                  background: "var(--accent)",
                  border: "none",
                  borderRadius: "10px",
                  color: "#070b14",
                  fontSize: "14px",
                  fontWeight: "700",
                  fontFamily: "var(--font-display)",
                  cursor: "pointer",
                }}
              >
                Yes, Start Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
