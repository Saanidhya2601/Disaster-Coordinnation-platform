// client/src/App.jsx
import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import socket from "./socket";
import "./App.css";

const API_URL = "http://localhost:5000/api";
const CENTER = [18.5204, 73.8567];
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
  high: getIcon("red"),
  medium: getIcon("orange"),
  low: getIcon("gold"),
  resource: getIcon("green"),
};

// --- AUTH COMPONENT ---
const AuthScreen = ({ onLogin }) => {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/auth/otp/send`, { phone });
      setStep(2);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to send OTP");
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
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
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <h2 className="auth-title">TimeChamp Dispatch</h2>
        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="form-group">
            <label>
              <b>Phone Number</b>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91..."
                className="form-input"
              />
            </label>
            <label>
              <b>Name (New Users)</b>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="form-input"
              />
            </label>
            <button type="submit" className="btn btn-green">
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="form-group">
            <label>
              <b>Enter OTP</b>
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="form-input"
              />
            </label>
            <button type="submit" className="btn btn-green">
              Verify & Login
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn btn-inactive"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// --- MAP COMPONENTS ---
const MapClickHandler = ({ setFormData }) => {
  useMapEvents({
    click(e) {
      setFormData((prev) => ({
        ...prev,
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      }));
    },
  });
  return null;
};

const SidebarForm = ({
  isPanelOpen,
  formType,
  setFormType,
  formData,
  setFormData,
  handleSubmit,
}) => (
  <div className={`side-panel ${isPanelOpen ? "panel-open" : "panel-closed"}`}>
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
        <b>Category</b>
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
        </select>
      </label>
      {formType === "request" ? (
        <label>
          <b>Urgency</b>
          <select
            value={formData.urgency}
            onChange={(e) =>
              setFormData({ ...formData, urgency: e.target.value })
            }
            className="form-input"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
      ) : (
        <label>
          <b>Quantity</b>
          <input
            type="number"
            min="1"
            value={formData.quantityAvailable}
            onChange={(e) =>
              setFormData({
                ...formData,
                quantityAvailable: parseInt(e.target.value),
              })
            }
            className="form-input"
          />
        </label>
      )}
      <label>
        <b>Description</b>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          required
          rows="3"
          className="form-input"
        />
      </label>
      <div className="coord-box">
        <b>Lat:</b> {formData.lat || "Pending"} | <b>Lng:</b>{" "}
        {formData.lng || "Pending"}
      </div>
      <button
        type="submit"
        className={`btn ${formType === "request" ? "btn-red" : "btn-green"}`}
      >
        Broadcast {formType === "request" ? "Request" : "Resource"}
      </button>
    </form>
  </div>
);

const MatchDashboard = ({
  isDashOpen,
  matches,
  mapItems,
  onUpdateMatchStatus,
}) => (
  <div className={`dash-panel ${isDashOpen ? "dash-open" : "dash-closed"}`}>
    <h3>Active Matches</h3>
    {matches.length === 0 && (
      <p style={{ color: "#666" }}>No active pairings.</p>
    )}
    {matches.map((match) => {
      const req = mapItems.find((i) => i.id === match.requestId);
      const res = mapItems.find((i) => i.id === match.resourceId);
      if (!req || !res) return null;

      return (
        <div key={match.id} className="match-card">
          <p style={{ margin: "0 0 8px 0", fontSize: "14px" }}>
            <b>Request:</b> {req.category.toUpperCase()} ({req.urgency})
          </p>
          <p style={{ margin: "0 0 12px 0", fontSize: "14px" }}>
            <b>Resource:</b> {res.category.toUpperCase()}
          </p>
          <small>Status: {match.status.toUpperCase()}</small>

          {match.status === "proposed" && (
            <div className="flex-row" style={{ margin: "10px 0 0 0" }}>
              <button
                onClick={() => onUpdateMatchStatus(match.id, "accepted")}
                className="btn btn-green flex-1"
              >
                Accept
              </button>
              <button
                onClick={() => onUpdateMatchStatus(match.id, "cancelled")}
                className="btn btn-red flex-1"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      );
    })}
  </div>
);

// --- MAIN APP ---
export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [mapItems, setMapItems] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [toast, setToast] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isDashOpen, setIsDashOpen] = useState(false);

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

  useEffect(() => {
    if (!token) return; // Don't fetch if not logged in

    Promise.all([
      axios.get(
        `${API_URL}/requests?lat=${CENTER[0]}&lng=${CENTER[1]}&radiusKm=15`,
        getHeaders(),
      ),
      axios.get(
        `${API_URL}/resources?lat=${CENTER[0]}&lng=${CENTER[1]}&radiusKm=15`,
        getHeaders(),
      ),
      axios.get(`${API_URL}/alerts`, getHeaders()), // Fetch active alerts
    ])
      .then(([reqRes, resRes, alertRes]) => {
        setMapItems([
          ...reqRes.data.requests.map((r) => ({ ...r, type: "request" })),
          ...resRes.data.resources.map((r) => ({ ...r, type: "resource" })),
        ]);
        setAlerts(alertRes.data.alerts); // Store the fetched alerts
      })
      .catch((err) => console.error("Load failed:", err));

    socket.on("request:new", (data) =>
      setMapItems((p) => [...p, { ...data, type: "request" }]),
    );
    socket.on("resource:new", (data) =>
      setMapItems((p) => [...p, { ...data, type: "resource" }]),
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
          prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m)),
        );
      }
    });

    // NEW: Listen for remote alerts
    socket.on("alert:new", (newAlert) => {
      setAlerts((prev) => [newAlert, ...prev]);
    });

    return () => {
      socket.off("request:new");
      socket.off("resource:new");
      socket.off("match:new");
      socket.off("item:resolved");
      socket.off("match:updated");
      socket.off("alert:new"); // Clean up alert listener
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
    if (!formData.lat || !formData.lng)
      return alert("Click map to set location.");
    try {
      await axios.post(`${API_URL}/${formType}s`, formData, getHeaders());
      setFormData({
        category: "medical",
        description: "",
        urgency: "high",
        quantityAvailable: 1,
        lat: "",
        lng: "",
      });
      setIsPanelOpen(false);
    } catch (error) {
      alert("Post failed.");
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
    } catch (error) {
      setMapItems(previousMapItems);
      setLiveMatches(previousMatches);
      alert("Database update failed!");
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

  if (!token) {
    return <AuthScreen onLogin={setToken} />;
  }

  return (
    <div className="app-wrapper">
      {/* NEW: Emergency Alert Banner UI */}
      {alerts.length > 0 && (
        <div className="alert-banner">
          ⚠️ {alerts[0].title}: {alerts[0].body}
          <button
            className="btn-close-alert"
            onClick={() => setAlerts(alerts.slice(1))}
          >
            Dismiss
          </button>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      <button onClick={handleLogout} className="btn-logout">
        Logout
      </button>

      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className="toggle-btn"
        style={{ left: isPanelOpen ? "320px" : "100px" }}
      >
        {isPanelOpen ? "◀ Close" : "▶ Dispatch"}
      </button>

      <button
        onClick={() => setIsDashOpen(!isDashOpen)}
        className="toggle-btn"
        style={{
          right: isDashOpen ? "320px" : "0",
          left: "auto",
          borderRadius: "8px 0 0 8px",
        }}
      >
        {isDashOpen ? "Close ▶" : "◀ Matches"}
      </button>

      <SidebarForm
        {...{
          isPanelOpen,
          formType,
          setFormType,
          formData,
          setFormData,
          handleSubmit,
        }}
      />
      <MatchDashboard
        isDashOpen={isDashOpen}
        matches={liveMatches}
        mapItems={mapItems}
        onUpdateMatchStatus={handleUpdateMatchStatus}
      />

      {/* NEW: Dynamically adjust map height if alerts are present */}
      <div
        className={`map-fullscreen ${alerts.length > 0 ? "map-fullscreen-pushed" : ""}`}
      >
        <MapContainer
          center={CENTER}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler setFormData={setFormData} />

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
                <b>
                  {item.type.toUpperCase()}: {item.category}
                </b>
                <br />
                {item.type === "request" && (
                  <span>
                    Urgency: {item.urgency}
                    <br />
                  </span>
                )}
                {item.description}
                <br />
                <small>Status: {item.status}</small>
                {item.id && (
                  <button
                    onClick={() => handleResolve(item.id, item.type)}
                    className="btn btn-gray"
                  >
                    ✓ Mark as Resolved
                  </button>
                )}
              </Popup>
            </Marker>
          ))}

          {liveMatches.map((match) => {
            const req = mapItems.find((i) => i.id === match.requestId);
            const res = mapItems.find((i) => i.id === match.resourceId);
            if (!req || !res) return null;

            return (
              <Polyline
                key={match.id}
                positions={[
                  [req.lat, req.lng],
                  [res.lat, res.lng],
                ]}
                color={match.status === "accepted" ? "#28a745" : "#0dcaf0"}
                weight={4}
                dashArray={match.status === "accepted" ? "" : "10, 10"}
              />
            );
          })}

          {formData.lat && formData.lng && (
            <Marker position={[formData.lat, formData.lng]} opacity={0.6}>
              <Popup>Target Location</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
