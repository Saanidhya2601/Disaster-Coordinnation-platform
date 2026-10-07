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

// --- HELPER: Fallback Distance Calculator (Haversine Formula) ---
const getStraightLineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
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

// --- AUTH COMPONENT ---
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
                placeholder="+91..."
                className="form-input"
              />
            </label>
            <label>
              Name (New Users)
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="form-input"
              />
            </label>
            <button
              type="submit"
              className="btn btn-green"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="form-group">
            <label>
              Enter OTP
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
              className="btn btn-green"
              disabled={isLoading}
            >
              {isLoading ? "Verifying..." : "Verify & Login"}
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

// --- MAP COMPONENTS ---
const MapClickHandler = ({ setFormData, openPanel }) => {
  useMapEvents({
    click(e) {
      setFormData((prev) => ({
        ...prev,
        lat: e.latlng.lat.toFixed(6),
        lng: e.latlng.lng.toFixed(6),
      }));
      openPanel();
    },
  });
  return null;
};

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
      <h3>Broadcast</h3>
      <button className="btn-icon-close" onClick={closePanel}>
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
          Urgency
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
                quantityAvailable: parseInt(e.target.value),
              })
            }
            className="form-input"
          />
        </label>
      )}

      <label>
        Description
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          required
          rows="3"
          placeholder="Provide specific details..."
          className="form-input"
        />
      </label>

      <div className="coord-box">
        {formData.lat
          ? `📍 ${formData.lat}, ${formData.lng}`
          : "Tap map to set location"}
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

const MatchDashboard = ({
  isDashOpen,
  closeDash,
  matches,
  mapItems,
  onUpdateMatchStatus,
}) => (
  <div className={`dash-panel ${isDashOpen ? "dash-open" : "dash-closed"}`}>
    <div className="panel-header">
      <h3>Active Matches</h3>
      <button className="btn-icon-close" onClick={closeDash}>
        ✕
      </button>
    </div>

    {matches.length === 0 && (
      <p style={{ color: "#6b7280", textAlign: "center", marginTop: "20px" }}>
        No active pairings found.
      </p>
    )}

    {matches.map((match) => {
      const req = mapItems.find((i) => i.id === match.requestId);
      const res = mapItems.find((i) => i.id === match.resourceId);
      if (!req || !res) return null;

      return (
        <div key={match.id} className="match-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 6px 0",
                  fontSize: "14px",
                  color: "#374151",
                }}
              >
                <strong>Request:</strong> {req.category.toUpperCase()}
                <span style={{ color: "#ef4444", marginLeft: "8px" }}>
                  ({req.urgency})
                </span>
              </p>
              <p
                style={{
                  margin: "0 0 6px 0",
                  fontSize: "14px",
                  color: "#374151",
                }}
              >
                <strong>Resource:</strong> {res.category.toUpperCase()}
              </p>
              <p
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "14px",
                  color: "#3b82f6",
                  fontWeight: "bold",
                }}
              >
                📍{" "}
                {match.distanceKm
                  ? `${match.distanceKm} km away`
                  : "Calculating route..."}
              </p>
            </div>
          </div>
          <div className="match-tag">{match.status}</div>

          {match.status === "proposed" && (
            <div className="flex-row" style={{ margin: "16px 0 0 0" }}>
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
    if (!isPanelOpen) setIsDashOpen(false);
  };

  const toggleDash = () => {
    setIsDashOpen(!isDashOpen);
    if (!isDashOpen) setIsPanelOpen(false);
  };

  // NEW: Background Routing Engine to trace streets and calculate distance
  useEffect(() => {
    const fetchMissingRoutes = async () => {
      // Find matches that don't have a route yet and aren't currently being fetched
      const matchesNeedingRoutes = liveMatches.filter(
        (m) => !m.routePath && !m.isFetchingRoute,
      );
      if (matchesNeedingRoutes.length === 0) return;

      // Mark them as fetching to avoid duplicate API calls
      setLiveMatches((prev) =>
        prev.map((m) =>
          matchesNeedingRoutes.find((needs) => needs.id === m.id)
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
            // Fetch route from Open Source Routing Machine (OSRM)
            // Note: OSRM takes coordinates as Longitude,Latitude
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${res.lng},${res.lat};${req.lng},${req.lat}?overview=full&geometries=geojson`;
            const response = await axios.get(osrmUrl);
            const data = response.data.routes[0];

            // GeoJSON returns [lng, lat], but Leaflet Polyline needs [lat, lng]
            const routePath = data.geometry.coordinates.map((coord) => [
              coord[1],
              coord[0],
            ]);
            const distanceKm = (data.distance / 1000).toFixed(2); // Convert meters to km

            return { ...match, routePath, distanceKm, isFetchingRoute: false };
          } catch (err) {
            console.error(
              `OSRM Routing failed for match ${match.id}, falling back to straight line.`,
            );
            // Fallback to straight-line distance if API fails
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

      // Merge the new route data back into state
      setLiveMatches((prev) =>
        prev.map((m) => {
          const updated = updatedMatches.find((u) => u.id === m.id);
          return updated ? updated : m;
        }),
      );
    };

    if (mapItems.length > 0) {
      fetchMissingRoutes();
    }
  }, [liveMatches, mapItems]);

  useEffect(() => {
    if (!token) return;

    Promise.all([
      axios.get(
        `${API_URL}/requests?lat=${CENTER[0]}&lng=${CENTER[1]}&radiusKm=15`,
        getHeaders(),
      ),
      axios.get(
        `${API_URL}/resources?lat=${CENTER[0]}&lng=${CENTER[1]}&radiusKm=15`,
        getHeaders(),
      ),
      axios.get(`${API_URL}/alerts`, getHeaders()),
    ])
      .then(([reqRes, resRes, alertRes]) => {
        setMapItems([
          ...reqRes.data.requests.map((r) => ({ ...r, type: "request" })),
          ...resRes.data.resources.map((r) => ({ ...r, type: "resource" })),
        ]);
        setAlerts(alertRes.data.alerts);
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
        // Maintain the existing route data when status changes to avoid recalculating
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
    if (!formData.lat || !formData.lng)
      return alert("Please tap the map to set a location.");

    setIsSubmitting(true);
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
      setToast("✅ Broadcast successful!");
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      alert("Failed to broadcast. Please try again.");
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
    } catch (error) {
      setMapItems(previousMapItems);
      setLiveMatches(previousMatches);
      alert("Status update failed! Reverting view.");
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

  if (!token) return <AuthScreen onLogin={setToken} />;

  return (
    <div className="app-wrapper">
      {/* Alert Banner */}
      {alerts.length > 0 && (
        <div className="alert-banner">
          <span>
            ⚠️ {alerts[0].title}: {alerts[0].body}
          </span>
          <button
            className="btn-close-alert"
            onClick={() => setAlerts(alerts.slice(1))}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <header className="navbar">
        <h2>📍 RescueBridge</h2>
        <button onClick={handleLogout} className="btn-logout-nav">
          Logout
        </button>
      </header>

      {/* Main UI Container */}
      <div className="main-content">
        {toast && <div className="toast">{toast}</div>}

        <button
          onClick={togglePanel}
          className="toggle-btn"
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
          className="toggle-btn"
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
                marginLeft: "8px",
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
                <Popup className="custom-popup">
                  <div style={{ padding: "4px" }}>
                    <h3
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: "15px",
                        color: "#111827",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      {item.category.toUpperCase()}
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "normal",
                          color: "#6b7280",
                        }}
                      >
                        {item.type === "request" ? "Need" : "Supply"}
                      </span>
                    </h3>

                    <p
                      style={{
                        margin: "0 0 12px 0",
                        color: "#4b5563",
                        fontSize: "13px",
                      }}
                    >
                      {item.description}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        marginBottom: "12px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      {item.type === "request" && (
                        <span
                          style={{
                            color: "#ef4444",
                            background: "#fef2f2",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {item.urgency} priority
                        </span>
                      )}
                      <span
                        style={{
                          color: "#10b981",
                          background: "#ecfdf5",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {item.status}
                      </span>
                    </div>

                    {item.id && (
                      <button
                        onClick={() => handleResolve(item.id, item.type)}
                        className="btn btn-gray"
                        style={{ width: "100%", padding: "8px" }}
                      >
                        ✓ Mark Resolved
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {liveMatches.map((match) => {
              const req = mapItems.find((i) => i.id === match.requestId);
              const res = mapItems.find((i) => i.id === match.resourceId);
              if (!req || !res) return null;

              // Use the fetched street route if available, otherwise fallback to straight line
              const pathPositions = match.routePath || [
                [req.lat, req.lng],
                [res.lat, res.lng],
              ];

              return (
                <Polyline
                  key={match.id}
                  positions={pathPositions}
                  color={match.status === "accepted" ? "#10b981" : "#3b82f6"}
                  weight={5}
                  opacity={0.8}
                  dashArray={match.status === "accepted" ? "" : "10, 12"}
                />
              );
            })}

            {formData.lat && formData.lng && (
              <Marker position={[formData.lat, formData.lng]} opacity={0.7}>
                <Popup>Selected Location</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
