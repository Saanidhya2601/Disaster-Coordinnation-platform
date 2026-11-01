// client/src/App.jsx
import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  Polyline,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import socket from "./socket";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const CENTER = [18.5204, 73.8567]; // Pune coordinates

const getIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

const ICONS = {
  critical: getIcon("red"),
  high: getIcon("red"),
  medium: getIcon("orange"),
  low: getIcon("gold"),
  resource: getIcon("green"),
};

// Haversine fallback calculator
const getStraightLineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2);
};

// --- AUTH SCREEN ---
const AuthScreen = ({ onLogin }) => {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/auth/otp/send`, { phone });
      setStep(2);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/otp/verify`, {
        phone,
        otp,
        name,
      });
      localStorage.setItem("token", res.data.token);
      onLogin(res.data.token);
    } catch (err) {
      alert(err.response?.data?.error || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <h2 className="auth-title">📍 RescueBridge</h2>
        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="form-group">
            <label>
              Phone Number
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="form-input"
              />
            </label>
            <label>
              Full Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Responder Name"
                className="form-input"
              />
            </label>
            <button
              type="submit"
              className="btn btn-indigo"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="form-group">
            <label>
              Enter 6-Digit OTP (Dev: 123456)
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="form-input"
              />
            </label>
            <button
              type="submit"
              className="btn btn-indigo"
              disabled={isLoading}
            >
              {isLoading ? "Verifying..." : "Verify & Launch"}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn btn-inactive"
              disabled={isLoading}
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// --- MAP CLICK HANDLER ---
const MapClickHandler = ({ setFormData, openPanel }) => {
  useMapEvents({
    click(e) {
      setFormData((prev) => ({
        ...prev,
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      }));
      openPanel();
    },
  });
  return null;
};

// --- DISPATCH SIDEBAR ---
const SidebarForm = ({
  isPanelOpen,
  closePanel,
  formType,
  setFormType,
  formData,
  setFormData,
  handleSubmit,
  isSubmitting,
}) => (
  <div className={`side-panel ${isPanelOpen ? "panel-open" : "panel-closed"}`}>
    <div className="panel-header">
      <h3>Broadcast Dispatch</h3>
      <button type="button" className="btn-icon-close" onClick={closePanel}>
        ✕
      </button>
    </div>

    <div className="flex-row">
      <button
        type="button"
        onClick={() => setFormType("request")}
        className={`btn flex-1 ${formType === "request" ? "btn-red" : "btn-inactive"}`}
      >
        Need Help
      </button>
      <button
        type="button"
        onClick={() => setFormType("resource")}
        className={`btn flex-1 ${formType === "resource" ? "btn-green" : "btn-inactive"}`}
      >
        Have Supplies
      </button>
    </div>

    <form onSubmit={handleSubmit} className="form-group">
      <label>
        Category
        <select
          value={formData.category}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value })
          }
          className="form-input"
        >
          <option value="medical">Medical</option>
          <option value="food">Food</option>
          <option value="rescue">Rescue</option>
          <option value="water">Water</option>
          <option value="shelter">Shelter</option>
        </select>
      </label>

      {formType === "request" ? (
        <label>
          Urgency Level
          <select
            value={formData.urgency}
            onChange={(e) =>
              setFormData({ ...formData, urgency: e.target.value })
            }
            className="form-input"
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
      ) : (
        <label>
          Quantity Available
          <input
            type="number"
            min="1"
            value={formData.quantityAvailable}
            onChange={(e) =>
              setFormData({
                ...formData,
                quantityAvailable: parseInt(e.target.value, 10) || 1,
              })
            }
            className="form-input"
          />
        </label>
      )}

      <label>
        Situation / Supply Details
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          required
          rows="3"
          placeholder="Provide clear landmarks, headcount, or supply specifics..."
          className="form-input"
        />
      </label>

      <div className="coord-box">
        {formData.lat && formData.lng
          ? `📍 ${formData.lat}, ${formData.lng}`
          : "Tap anywhere on the map to set coordinates"}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`btn ${formType === "request" ? "btn-red" : "btn-green"}`}
      >
        {isSubmitting
          ? "Broadcasting..."
          : `Broadcast ${formType === "request" ? "Request" : "Resource"}`}
      </button>
    </form>
  </div>
);

// --- MATCH DASHBOARD ---
const MatchDashboard = ({
  isDashOpen,
  closeDash,
  matches,
  mapItems,
  onUpdateMatchStatus,
}) => (
  <div className={`dash-panel ${isDashOpen ? "dash-open" : "dash-closed"}`}>
    <div className="panel-header">
      <h3>Active Pairings</h3>
      <button type="button" className="btn-icon-close" onClick={closeDash}>
        ✕
      </button>
    </div>

    {matches.length === 0 && (
      <p
        style={{
          color: "#64748b",
          textAlign: "center",
          marginTop: "24px",
          fontSize: "14px",
        }}
      >
        No active matches yet. Drop matching Need & Supply pins within 10km to
        auto-pair.
      </p>
    )}

    {matches.map((match) => {
      const req = mapItems.find((i) => i.id === match.requestId);
      const res = mapItems.find((i) => i.id === match.resourceId);
      if (!req || !res) return null;

      return (
        <div key={match.id} className="match-card">
          <p style={{ margin: "0 0 6px 0", fontSize: "14px" }}>
            <strong>Request:</strong> {req.category.toUpperCase()}
            <span
              style={{ color: "#ef4444", marginLeft: "6px", fontWeight: 600 }}
            >
              ({req.urgency})
            </span>
          </p>
          <p
            style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#475569" }}
          >
            {req.description}
          </p>
          <p style={{ margin: "0 0 8px 0", fontSize: "14px" }}>
            <strong>Supply:</strong> {res.category.toUpperCase()} (
            {res.description})
          </p>
          <p
            style={{
              margin: "0 0 10px 0",
              fontSize: "13px",
              color: "#4f46e5",
              fontWeight: 700,
            }}
          >
            🚗{" "}
            {match.distanceKm
              ? `${match.distanceKm} km shortest driving route`
              : "Calculating street route..."}
          </p>
          <div className="match-tag">{match.status}</div>

          {match.status === "proposed" && (
            <div className="flex-row" style={{ margin: "14px 0 0 0" }}>
              <button
                onClick={() => onUpdateMatchStatus(match.id, "accepted")}
                className="btn btn-green flex-1"
              >
                Accept Route
              </button>
              <button
                onClick={() => onUpdateMatchStatus(match.id, "cancelled")}
                className="btn btn-red flex-1"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      );
    })}
  </div>
);

// --- MAIN APPLICATION ---
export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [mapItems, setMapItems] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [toast, setToast] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isDashOpen, setIsDashOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertForm, setAlertForm] = useState({ title: "", body: "" });

  const [formType, setFormType] = useState("request");
  const [formData, setFormData] = useState({
    category: "medical",
    description: "",
    urgency: "high",
    quantityAvailable: 1,
    lat: "",
    lng: "",
  });

  const getHeaders = () => ({ headers: { Authorization: `Bearer ${token}` } });

  const togglePanel = () => {
    setIsPanelOpen((prev) => {
      if (!prev) setIsDashOpen(false);
      return !prev;
    });
  };

  const toggleDash = () => {
    setIsDashOpen((prev) => {
      if (!prev) setIsPanelOpen(false);
      return !prev;
    });
  };

  // OSRM Street Routing Engine
  useEffect(() => {
    const fetchMissingRoutes = async () => {
      const matchesNeedingRoutes = liveMatches.filter(
        (m) => !m.routePath && !m.isFetchingRoute,
      );
      if (matchesNeedingRoutes.length === 0) return;

      setLiveMatches((prev) =>
        prev.map((m) =>
          matchesNeedingRoutes.some((n) => n.id === m.id)
            ? { ...m, isFetchingRoute: true }
            : m,
        ),
      );

      const updatedMatches = await Promise.all(
        matchesNeedingRoutes.map(async (match) => {
          const req = mapItems.find((i) => i.id === match.requestId);
          const res = mapItems.find((i) => i.id === match.resourceId);
          if (!req || !res) return { ...match, isFetchingRoute: false };

          try {
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${res.lng},${res.lat};${req.lng},${req.lat}?overview=full&geometries=geojson`;
            const response = await axios.get(osrmUrl);
            const route = response.data.routes[0];
            const routePath = route.geometry.coordinates.map((c) => [
              c[1],
              c[0],
            ]);
            const distanceKm = (route.distance / 1000).toFixed(2);

            return { ...match, routePath, distanceKm, isFetchingRoute: false };
          } catch (err) {
            const distanceKm = getStraightLineDistance(
              req.lat,
              req.lng,
              res.lat,
              res.lng,
            );
            return {
              ...match,
              routePath: [
                [req.lat, req.lng],
                [res.lat, res.lng],
              ],
              distanceKm,
              isFetchingRoute: false,
            };
          }
        }),
      );

      setLiveMatches((prev) =>
        prev.map((m) => updatedMatches.find((u) => u.id === m.id) || m),
      );
    };

    if (mapItems.length > 0 && liveMatches.length > 0) {
      fetchMissingRoutes();
    }
  }, [liveMatches, mapItems]);

  // Initial Data Load & WebSockets
  useEffect(() => {
    if (!token) return;

    Promise.all([
      axios.get(
        `${API_URL}/requests?lat=${CENTER[0]}&lng=${CENTER[1]}&radiusKm=25`,
        getHeaders(),
      ),
      axios.get(
        `${API_URL}/resources?lat=${CENTER[0]}&lng=${CENTER[1]}&radiusKm=25`,
        getHeaders(),
      ),
      axios
        .get(`${API_URL}/alerts`, getHeaders())
        .catch(() => ({ data: { alerts: [] } })),
    ])
      .then(([reqRes, resRes, alertRes]) => {
        setMapItems([
          ...(reqRes.data.requests || []).map((r) => ({
            ...r,
            lat: Number(r.lat),
            lng: Number(r.lng),
            type: "request",
          })),
          ...(resRes.data.resources || []).map((r) => ({
            ...r,
            lat: Number(r.lat),
            lng: Number(r.lng),
            type: "resource",
          })),
        ]);
        setAlerts(alertRes.data.alerts || []);
      })
      .catch((err) => console.error("Initial load error:", err));

    socket.on("request:new", (data) =>
      setMapItems((p) => [
        ...p,
        {
          ...data,
          lat: Number(data.lat),
          lng: Number(data.lng),
          type: "request",
        },
      ]),
    );
    socket.on("resource:new", (data) =>
      setMapItems((p) => [
        ...p,
        {
          ...data,
          lat: Number(data.lat),
          lng: Number(data.lng),
          type: "resource",
        },
      ]),
    );
    socket.on("match:new", (matches) => {
      setLiveMatches((p) => [...p, ...matches]);
      setToast(`⚡ Auto-Match: Paired ${matches.length} nearby locations!`);
      setTimeout(() => setToast(null), 6000);
    });
    socket.on("item:resolved", (id) => {
      setMapItems((prev) => prev.filter((item) => item.id !== id));
      setLiveMatches((prev) =>
        prev.filter((m) => m.requestId !== id && m.resourceId !== id),
      );
    });
    socket.on("match:updated", (updatedMatch) => {
      if (updatedMatch.status === "cancelled") {
        setLiveMatches((prev) => prev.filter((m) => m.id !== updatedMatch.id));
      } else {
        setLiveMatches((prev) =>
          prev.map((m) =>
            m.id === updatedMatch.id
              ? {
                  ...updatedMatch,
                  routePath: m.routePath,
                  distanceKm: m.distanceKm,
                }
              : m,
          ),
        );
      }
    });
    socket.on("alert:new", (newAlert) =>
      setAlerts((prev) => [newAlert, ...prev]),
    );

    return () => {
      socket.off("request:new");
      socket.off("resource:new");
      socket.off("match:new");
      socket.off("item:resolved");
      socket.off("match:updated");
      socket.off("alert:new");
    };
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setMapItems([]);
    setLiveMatches([]);
    setAlerts([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lat || !formData.lng) {
      return alert("Please tap on the map to set a location first.");
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
      };
      await axios.post(`${API_URL}/${formType}s`, payload, getHeaders());
      setFormData({
        category: "medical",
        description: "",
        urgency: "high",
        quantityAvailable: 1,
        lat: "",
        lng: "",
      });
      setIsPanelOpen(false);
      setToast("✅ Broadcast live on map!");
      setTimeout(() => setToast(null), 3500);
    } catch (error) {
      const errorMsg =
        error.response?.data?.error || error.message || "Failed to broadcast.";
      alert(`Error: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (id, type) => {
    const previousMapItems = [...mapItems];
    const previousMatches = [...liveMatches];
    setMapItems((prev) => prev.filter((item) => item.id !== id));
    setLiveMatches((prev) =>
      prev.filter((m) => m.requestId !== id && m.resourceId !== id),
    );

    const targetStatus = type === "request" ? "fulfilled" : "depleted";
    try {
      await axios.patch(
        `${API_URL}/${type}s/${id}/status`,
        { status: targetStatus },
        getHeaders(),
      );
      setToast("✓ Item marked as resolved");
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      setMapItems(previousMapItems);
      setLiveMatches(previousMatches);
      alert("Database status update failed.");
    }
  };

  const handleUpdateMatchStatus = async (matchId, newStatus) => {
    try {
      await axios.patch(
        `${API_URL}/matches/${matchId}/status`,
        { status: newStatus },
        getHeaders(),
      );
    } catch (error) {
      alert("Failed to update match status.");
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/alerts`, alertForm, getHeaders());
      setAlertForm({ title: "", body: "" });
      setIsAlertModalOpen(false);
    } catch (error) {
      alert(
        error.response?.data?.error || "Failed to broadcast emergency alert.",
      );
    }
  };

  if (!token) return <AuthScreen onLogin={setToken} />;

  return (
    <div
      className={`app-wrapper ${isPanelOpen || isDashOpen ? "panel-active" : ""}`}
    >
      {alerts.length > 0 && (
        <div className="alert-banner">
          <span>
            ⚠️ <strong>{alerts[0].title}:</strong> {alerts[0].body}
          </span>
          <button
            className="btn-close-alert"
            onClick={() => setAlerts(alerts.slice(1))}
          >
            Dismiss
          </button>
        </div>
      )}

      <header className="navbar">
        <h2 className="navbar-brand">📍 RescueBridge</h2>
        <div className="navbar-actions">
          <button
            onClick={() => setIsAlertModalOpen(true)}
            className="btn-nav btn-nav-alert"
          >
            📢 Broadcast Alert
          </button>
          <button onClick={handleLogout} className="btn-nav btn-nav-logout">
            Logout
          </button>
        </div>
      </header>

      {isAlertModalOpen && (
        <div className="modal-overlay">
          <div className="auth-card">
            <div className="panel-header">
              <h3>📢 Emergency Broadcast</h3>
              <button
                type="button"
                className="btn-icon-close"
                onClick={() => setIsAlertModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateAlert} className="form-group">
              <label>
                Alert Headline
                <input
                  type="text"
                  required
                  placeholder="e.g., Flash Flood Warning - Sector 4"
                  value={alertForm.title}
                  onChange={(e) =>
                    setAlertForm({ ...alertForm, title: e.target.value })
                  }
                  className="form-input"
                />
              </label>
              <label>
                Instructions
                <textarea
                  required
                  rows="3"
                  placeholder="Evacuate low-lying areas immediately..."
                  value={alertForm.body}
                  onChange={(e) =>
                    setAlertForm({ ...alertForm, body: e.target.value })
                  }
                  className="form-input"
                />
              </label>
              <button type="submit" className="btn btn-red">
                Transmit Global Alert
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="main-content">
        {toast && <div className="toast">{toast}</div>}

        <button
          onClick={togglePanel}
          className="toggle-btn btn-left-tab"
          style={{
            left: "0",
            borderRadius: "0 8px 8px 0",
            display: isPanelOpen ? "none" : "flex",
          }}
        >
          ▶ Dispatch
        </button>

        <button
          onClick={toggleDash}
          className="toggle-btn btn-right-tab"
          style={{
            right: "0",
            borderRadius: "8px 0 0 8px",
            display: isDashOpen ? "none" : "flex",
          }}
        >
          ◀ Matches
          {liveMatches.length > 0 && (
            <span
              style={{
                background: "#ef4444",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "12px",
              }}
            >
              {liveMatches.length}
            </span>
          )}
        </button>

        <SidebarForm
          isPanelOpen={isPanelOpen}
          closePanel={() => setIsPanelOpen(false)}
          formType={formType}
          setFormType={setFormType}
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />

        <MatchDashboard
          isDashOpen={isDashOpen}
          closeDash={() => setIsDashOpen(false)}
          matches={liveMatches}
          mapItems={mapItems}
          onUpdateMatchStatus={handleUpdateMatchStatus}
        />

        <div className="map-fullscreen">
          <MapContainer
            center={CENTER}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
          >
            <ZoomControl position="bottomright" />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapClickHandler
              setFormData={setFormData}
              openPanel={() => {
                setIsPanelOpen(true);
                setIsDashOpen(false);
              }}
            />

            {mapItems.map((item) => (
              <Marker
                key={item.id}
                position={[item.lat, item.lng]}
                icon={
                  item.type === "resource"
                    ? ICONS.resource
                    : ICONS[item.urgency] || ICONS.high
                }
              >
                <Popup>
                  <div style={{ minWidth: "180px", padding: "2px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "6px",
                      }}
                    >
                      <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                        {item.category.toUpperCase()}
                      </strong>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background:
                            item.type === "request" ? "#fee2e2" : "#d1fae5",
                          color:
                            item.type === "request" ? "#b91c1c" : "#047857",
                        }}
                      >
                        {item.type === "request" ? "NEED" : "SUPPLY"}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: "0 0 10px 0",
                        fontSize: "13px",
                        color: "#334155",
                      }}
                    >
                      {item.description}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        marginBottom: "10px",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      {item.type === "request" && (
                        <span
                          style={{
                            color: "#dc2626",
                            background: "#fef2f2",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {item.urgency}
                        </span>
                      )}
                      <span
                        style={{
                          color: "#4f46e5",
                          background: "#e0e7ff",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {item.status}
                      </span>
                    </div>

                    <button
                      onClick={() => handleResolve(item.id, item.type)}
                      className="btn btn-gray"
                      style={{
                        padding: "8px",
                        marginTop: "4px",
                        fontSize: "12px",
                      }}
                    >
                      ✓ Mark Resolved
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {liveMatches.map((match) => {
              const req = mapItems.find((i) => i.id === match.requestId);
              const res = mapItems.find((i) => i.id === match.resourceId);
              if (!req || !res) return null;

              const pathPositions = match.routePath || [
                [req.lat, req.lng],
                [res.lat, res.lng],
              ];

              return (
                <Polyline
                  key={match.id}
                  positions={pathPositions}
                  color={match.status === "accepted" ? "#10b981" : "#4f46e5"}
                  weight={5}
                  opacity={0.85}
                  dashArray={match.status === "accepted" ? "" : "8, 10"}
                />
              );
            })}

            {formData.lat && formData.lng && (
              <Marker position={[formData.lat, formData.lng]} opacity={0.7}>
                <Popup>Target Dispatch Location</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
