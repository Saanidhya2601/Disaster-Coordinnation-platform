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

export default function App() {
  const [mapItems, setMapItems] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [toast, setToast] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [formType, setFormType] = useState("request");
  const [formData, setFormData] = useState({
    category: "medical",
    description: "",
    urgency: "high",
    quantityAvailable: 1,
    lat: "",
    lng: "",
  });

  useEffect(() => {
    Promise.all([
      axios.get(
        `${API_URL}/requests?lat=${CENTER[0]}&lng=${CENTER[1]}&radiusKm=15`,
      ),
      axios.get(
        `${API_URL}/resources?lat=${CENTER[0]}&lng=${CENTER[1]}&radiusKm=15`,
      ),
    ])
      .then(([reqRes, resRes]) => {
        setMapItems([
          ...reqRes.data.requests.map((r) => ({ ...r, type: "request" })),
          ...resRes.data.resources.map((r) => ({ ...r, type: "resource" })),
        ]);
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

    return () => {
      socket.off("request:new");
      socket.off("resource:new");
      socket.off("match:new");
      socket.off("item:resolved");
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lat || !formData.lng)
      return alert("Click map to set location.");

    try {
      await axios.post(`${API_URL}/${formType}s`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setFormData({
        ...formData,
        description: "",
        lat: "",
        lng: "",
        quantityAvailable: 1,
      });
      setIsPanelOpen(false);
    } catch (error) {
      alert("Post failed. Check backend logs.");
    }
  };

  const handleResolve = async (id, type) => {
    const previousMapItems = [...mapItems];
    const previousMatches = [...liveMatches];

    setMapItems((prev) => prev.filter((item) => item.id !== id));
    setLiveMatches((prev) =>
      prev.filter((m) => m.requestId !== id && m.resourceId !== id),
    );

    // Map correctly to schema enum values: RequestStatus uses 'fulfilled', ResourceStatus uses 'depleted'
    const targetStatus = type === "request" ? "fulfilled" : "depleted";

    try {
      await axios.patch(
        `${API_URL}/${type}s/${id}/status`,
        { status: targetStatus },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
    } catch (error) {
      console.error(error);
      setMapItems(previousMapItems);
      setLiveMatches(previousMatches);
      alert("Database update failed! The marker has been restored.");
    }
  };

  return (
    <div className="app-wrapper">
      {toast && <div className="toast">{toast}</div>}

      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className="toggle-btn"
        style={{ left: isPanelOpen ? "320px" : "0" }}
      >
        {isPanelOpen ? "◀ Close" : "▶ Dispatch"}
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

      <div className="map-fullscreen">
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

          {liveMatches.map((match, idx) => {
            const req = mapItems.find((i) => i.id === match.requestId);
            const res = mapItems.find((i) => i.id === match.resourceId);
            return req && res ? (
              <Polyline
                key={idx}
                positions={[
                  [req.lat, req.lng],
                  [res.lat, res.lng],
                ]}
                color="#0dcaf0"
                weight={4}
                dashArray="10, 10"
              />
            ) : null;
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
