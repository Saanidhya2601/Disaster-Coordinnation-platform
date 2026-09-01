// client/src/App.jsx
import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import socket from "./socket";

// Custom Map Markers
const requestIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const resourceIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function MapClickHandler({ setFormData }) {
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
}

function App() {
  const [mapItems, setMapItems] = useState([]);
  const [formType, setFormType] = useState("request"); // 'request' or 'resource'
  const [formData, setFormData] = useState({
    category: "medical",
    description: "",
    urgency: "high",
    quantityAvailable: 1,
    lat: "",
    lng: "",
  });
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const center = [18.5204, 73.8567];

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [reqRes, resRes] = await Promise.all([
          axios.get(
            `http://localhost:5000/api/requests?lat=${center[0]}&lng=${center[1]}&radiusKm=15`,
          ),
          axios.get(
            `http://localhost:5000/api/resources?lat=${center[0]}&lng=${center[1]}&radiusKm=15`,
          ),
        ]);
        const existingRequests = reqRes.data.requests.map((r) => ({
          ...r,
          type: "request",
        }));
        const existingResources = resRes.data.resources.map((r) => ({
          ...r,
          type: "resource",
        }));
        setMapItems([...existingRequests, ...existingResources]);
      } catch (error) {
        console.error("Failed to load map data:", error);
      }
    };
    fetchInitialData();

    socket.on("request:new", (data) =>
      setMapItems((prev) => [...prev, { ...data, type: "request" }]),
    );
    socket.on("resource:new", (data) =>
      setMapItems((prev) => [...prev, { ...data, type: "resource" }]),
    );

    return () => {
      socket.off("request:new");
      socket.off("resource:new");
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lat || !formData.lng)
      return alert("Click on the map to set the location.");

    try {
      // Route dynamically based on formType
      const endpoint =
        formType === "request"
          ? "http://localhost:5000/api/requests"
          : "http://localhost:5000/api/resources";

      await axios.post(endpoint, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, // Update this for your auth logic
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
      console.error(error);
      alert("Failed to post. Check backend terminal for Auth/DB errors.");
    }
  };

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        width: "100vw",
        fontFamily: "sans-serif",
        overflow: "hidden",
      }}
    >
      {/* TOGGLE BUTTON */}
      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        style={{
          position: "absolute",
          top: "20px",
          left: isPanelOpen ? "320px" : "0",
          zIndex: 1001,
          padding: "12px 16px",
          backgroundColor: "#343a40",
          color: "white",
          border: "none",
          borderRadius: "0 8px 8px 0",
          cursor: "pointer",
          fontWeight: "bold",
          transition: "left 0.3s ease",
          boxShadow: "2px 0 8px rgba(0,0,0,0.2)",
        }}
      >
        {isPanelOpen ? "◀ Close" : "▶ Dispatch"}
      </button>

      {/* SLIDING CONTROL PANEL */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: "320px",
          backgroundColor: "#ffffff",
          boxShadow: "2px 0 15px rgba(0,0,0,0.2)",
          zIndex: 1000,
          overflowY: "auto",
          transform: isPanelOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "30px",
            marginBottom: "20px",
          }}
        >
          <button
            type="button"
            onClick={() => setFormType("request")}
            style={{
              flex: 1,
              padding: "10px",
              backgroundColor: formType === "request" ? "#dc3545" : "#e9ecef",
              color: formType === "request" ? "white" : "black",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Need Help
          </button>
          <button
            type="button"
            onClick={() => setFormType("resource")}
            style={{
              flex: 1,
              padding: "10px",
              backgroundColor: formType === "resource" ? "#28a745" : "#e9ecef",
              color: formType === "resource" ? "white" : "black",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Have Supplies
          </button>
        </div>

        <p style={{ fontSize: "14px", color: "#666", marginTop: 0 }}>
          1. Click the map to set coordinates.
          <br />
          2. Fill details and broadcast.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "15px" }}
        >
          <label>
            <b>Category</b>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              style={{ width: "100%", padding: "8px", marginTop: "5px" }}
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
                style={{ width: "100%", padding: "8px", marginTop: "5px" }}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
          ) : (
            <label>
              <b>Quantity Available</b>
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
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "5px",
                  boxSizing: "border-box",
                }}
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
              style={{
                width: "100%",
                padding: "8px",
                marginTop: "5px",
                boxSizing: "border-box",
              }}
            />
          </label>

          <div
            style={{
              padding: "10px",
              backgroundColor: "#e9ecef",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          >
            <b>Lat:</b> {formData.lat ? formData.lat.toFixed(4) : "Pending"}
            <br />
            <b>Lng:</b> {formData.lng ? formData.lng.toFixed(4) : "Pending"}
          </div>

          <button
            type="submit"
            style={{
              padding: "12px",
              backgroundColor: formType === "request" ? "#dc3545" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Broadcast {formType === "request" ? "Request" : "Resource"}
          </button>
        </form>
      </div>

      {/* FULL-SCREEN MAP */}
      <div
        style={{
          height: "100vh",
          width: "100vw",
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 1,
        }}
      >
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler setFormData={setFormData} />

          {mapItems.map((item, idx) => (
            <Marker
              key={item.id || idx}
              position={[item.lat, item.lng]}
              icon={item.type === "request" ? requestIcon : resourceIcon}
            >
              <Popup>
                <b>
                  {item.type.toUpperCase()}: {item.category}
                </b>
                <br />
                {item.description}
                <br />
                <small>Status: {item.status}</small>
              </Popup>
            </Marker>
          ))}

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

export default App;
