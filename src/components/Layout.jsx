import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Megaphone,
  PhoneCall,
  MailCheck,
  Calendar,
  ShieldAlert,
  FileText,
  MessageSquare,
  BarChart3,
  LogOut,
  Search,
  Activity,
  Plus,
} from "lucide-react";
import logo from "../logo.png";

export default function Layout({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/campaigns", label: "Campaigns", icon: Megaphone },
    { to: "/calls", label: "Call Logs", icon: PhoneCall },
    { to: "/retries", label: "Voicemail & Retries", icon: MailCheck },
    { to: "/meetings", label: "Meetings", icon: Calendar },
    { to: "/dnc", label: "Do Not Call", icon: ShieldAlert },
    { to: "/summaries", label: "Summaries", icon: FileText },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/report", label: "Daily Report", icon: BarChart3 },
  ];

  const getPageTitle = (path) => {
    const found = navItems.find((item) => item.to === path);
    return found ? found.label : "Dashboard";
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: "260px",
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: "24px 0",
          position: "fixed",
          height: "100vh",
          zIndex: 50,
          boxShadow: "4px 0 24px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div
          style={{
            padding: "0 24px 28px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <img
            src={logo}
            alt="AISE"
            style={{ height: "36px", objectFit: "contain" }}
          />
          {/* <span className="badge badge-cyan" style={{ fontSize: '10px', padding: '2px 8px' }}>v2.5 PRO</span> */}
        </div>

        <nav style={{ flex: 1, padding: "0 14px", overflowY: "auto" }}>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "11px 16px",
                borderRadius: "12px",
                marginBottom: "6px",
                textDecoration: "none",
                fontSize: "14px",
                fontFamily: "var(--font-body)",
                fontWeight: isActive ? "600" : "500",
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                background: isActive
                  ? "linear-gradient(90deg, rgba(0, 212, 255, 0.18) 0%, rgba(0, 212, 255, 0.04) 100%)"
                  : "transparent",
                border: isActive
                  ? "1px solid rgba(0, 212, 255, 0.3)"
                  : "1px solid transparent",
                boxShadow: isActive
                  ? "0 4px 14px rgba(0, 212, 255, 0.15)"
                  : "none",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    style={{
                      color: isActive ? "var(--accent)" : "var(--text-muted)",
                    }}
                  />
                  <span style={{ flex: 1 }}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div
          style={{
            padding: "16px 14px 0",
            borderTop: "1px solid var(--border)",
          }}
        >
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "11px 16px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "12px",
              color: "var(--accent-red)",
              fontSize: "14px",
              fontFamily: "var(--font-body)",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              transition: "all 0.2s",
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div
        style={{
          marginLeft: "260px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        {/* Top Navigation Bar Header */}
        <header
          className="no-print"
          style={{
            height: "72px",
            background: "rgba(10, 15, 29, 0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 32px",
            position: "sticky",
            top: 0,
            zIndex: 40,
          }}
        >
          {/* Breadcrumb & Title */}
          <div>
            <h2
              style={{
                fontSize: "18px",
                fontFamily: "var(--font-display)",
                fontWeight: "700",
                color: "var(--text-primary)",
              }}
            >
              {getPageTitle(location.pathname)}
            </h2>
          </div>

          {/* Right Header Status & Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Global Quick Action Button */}
            <button
              onClick={() => navigate("/campaigns")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "linear-gradient(135deg, #00d4ff 0%, #0088ff 100%)",
                color: "#040914",
                border: "none",
                borderRadius: "10px",
                padding: "9px 16px",
                fontSize: "13px",
                fontWeight: "700",
                fontFamily: "var(--font-body)",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(0, 212, 255, 0.3)",
                transition: "all 0.2s",
              }}
            >
              <Plus size={16} strokeWidth={3} />
              New Campaign
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <main style={{ padding: "32px", flex: 1 }} className="animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
