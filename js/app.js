// js/app.js
// Put your GeoJSON files here (same repo, committed):
//  - assets/vehicle_collisions_filtered.geojson
//  - assets/persons_collisions_filtered.geojson

mapboxgl.accessToken =
  "pk.eyJ1Ijoid3RlbmcwMjEyIiwiYSI6ImNtMXBkZzB4MDAzaW0ya29kbXg3YzRqbjkifQ.VNzDni3iko1Tm_oG2ztG4A";

const VEHICLE_URL = "assets/vehicle_collisions_filtered.geojson";
const PERSON_URL = "assets/persons_collisions_filtered.geojson";
const DAY_MS = 24 * 60 * 60 * 1000;

// Timeline stats (across both datasets)
const timeline = {
  minTs: Infinity,
  maxTs: -Infinity,
  ready: false,
};

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/wteng0212/cmip7k46t000201si4ik736x1",
  center: [-122.3321, 47.6170],
  zoom: 10.3,
});

map.addControl(new mapboxgl.NavigationControl(), "top-right");

// ---------- Helpers ----------
async function fetchGeoJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed (${res.status}): ${url}`);
  return res.json();
}

function setLayerVisible(layerId, visible) {
  if (!map.getLayer(layerId)) return;
  map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
}

function propOrDash(props, key) {
  const v = props?.[key];
  return v === null || v === undefined || v === "" ? "—" : v;
}

// Parse "Incident Date" into a UTC timestamp at midnight.
// Works great for your ISO format "YYYY-MM-DD".
function parseIncidentDateToTs(props) {
  const s =
    props?.["Incident Date"] ??
    props?.["incident_date"] ??
    props?.["INCIDENT_DATE"] ??
    null;

  if (!s || typeof s !== "string") return null;

  // ISO date: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) {
    // Force UTC midnight so it's consistent across timezones
    const ts = Date.parse(`${s.trim()}T00:00:00Z`);
    return Number.isFinite(ts) ? ts : null;
  }

  // Fallback: try Date.parse for other formats
  const ts = Date.parse(s);
  return Number.isFinite(ts) ? ts : null;
}

// Add a numeric date field "date_ts" to every feature (used for filtering),
// and update global min/max.
function preprocessGeoJSONForTime(geojson) {
  if (!geojson?.features?.length) return geojson;

  let localMin = Infinity;
  let localMax = -Infinity;

  geojson.features = geojson.features.map((f) => {
    const props = f.properties || {};
    const ts = parseIncidentDateToTs(props);

    // Put it on the feature so Mapbox can filter it
    props.date_ts = ts; // number or null
    f.properties = props;

    if (Number.isFinite(ts)) {
      localMin = Math.min(localMin, ts);
      localMax = Math.max(localMax, ts);
    }
    return f;
  });

  if (Number.isFinite(localMin)) timeline.minTs = Math.min(timeline.minTs, localMin);
  if (Number.isFinite(localMax)) timeline.maxTs = Math.max(timeline.maxTs, localMax);

  return geojson;
}

function formatISODate(ts) {
  // Use ISO date so it matches your data format
  return new Date(ts).toISOString().slice(0, 10);
}

function applyTimeFilter(ts) {
  const filter = ["<=", ["get", "date_ts"], ts];

  const layerIds = [
    "vehicle-collisions-heat",
    "vehicle-collisions-layer",
    "person-collisions-heat",
    "person-collisions-layer",
  ];

  layerIds.forEach((id) => {
    if (map.getLayer(id)) map.setFilter(id, filter);
  });
}

// Robust field reads (handles different casing)
const vehicleSeverity = [
  "coalesce",
  ["get", "injury severity"],
  ["get", "Injury Severity"],
  ["get", "Injury severity"],
];
const personSeverity = ["get", "Injury Severity"];

// Your current heat colors
const HEAT_COLOR_RAMP = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0, "rgba(0,0,0,0)",
  0.20, "rgba(59,130,246,0.20)",  // soft blue
  0.40, "rgba(14,165,233,0.28)",  // cyan
  0.60, "rgba(34,197,94,0.34)",   // green
  0.80, "rgba(255, 204, 0, 0.79)", // yellow
  1.00, "rgba(249, 22, 22, 0.55)", // (your) red
];

const HEAT_INTENSITY = ["interpolate", ["linear"], ["zoom"], 0, 0.45, 13, 1.35];
const HEAT_RADIUS = ["interpolate", ["linear"], ["zoom"], 0, 4, 9, 18, 13, 40];
const HEAT_OPACITY = ["interpolate", ["linear"], ["zoom"], 11.5, 0.9, 13, 0.0];

map.on("load", async () => {
  try {
    await Promise.all([addVehicleLayers(), addPersonLayers()]);
    wireLayerToggles();

    // Create slider AFTER layers exist and we know the date range
    setupTimeSlider();
  } catch (e) {
    console.error(e);
  }
});

// ---------- Vehicle layers ----------
async function addVehicleLayers() {
  let data = await fetchGeoJSON(VEHICLE_URL);
  data = preprocessGeoJSONForTime(data);

  if (!map.getSource("vehicle-collisions")) {
    map.addSource("vehicle-collisions", { type: "geojson", data });
  }

  // Heatmap (low/mid zoom)
  if (!map.getLayer("vehicle-collisions-heat")) {
    map.addLayer({
      id: "vehicle-collisions-heat",
      type: "heatmap",
      source: "vehicle-collisions",
      maxzoom: 13,
      paint: {
        "heatmap-weight": [
          "match",
          vehicleSeverity,
          "Fatal", 1.4,
          "Serious", 1.0,
          "Minor", 0.7,
          0.5,
        ],
        "heatmap-intensity": HEAT_INTENSITY,
        "heatmap-radius": HEAT_RADIUS,
        "heatmap-color": HEAT_COLOR_RAMP,
        "heatmap-opacity": HEAT_OPACITY,
      },
    });
  }

  // Circles (high zoom, clickable)
  if (!map.getLayer("vehicle-collisions-layer")) {
    map.addLayer({
      id: "vehicle-collisions-layer",
      type: "circle",
      source: "vehicle-collisions",
      minzoom: 13,
      paint: {
        "circle-radius": 6,
        "circle-opacity": 0.9,
        "circle-color": [
          "match",
          vehicleSeverity,
          "Fatal", "red",
          "Serious", "orange",
          "Minor", "yellow",
          "#666",
        ],
        "circle-stroke-color": "#fff",
        "circle-stroke-width": 1,
      },
    });
  }

  map.on("click", "vehicle-collisions-layer", (e) => {
    const props = e.features?.[0]?.properties || {};
    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(`
        <div style="font-size:12px;line-height:1.4">
          <b>Incident Date:</b> ${propOrDash(props, "Incident Date")}<br>
          <b>Report #:</b> ${propOrDash(props, "Report Number")}<br>
          <b>Vehicle Type:</b> ${propOrDash(props, "Vehicle Type")}<br>
        </div>
      `)
      .addTo(map);
  });

  map.on("mouseenter", "vehicle-collisions-layer", () => (map.getCanvas().style.cursor = "pointer"));
  map.on("mouseleave", "vehicle-collisions-layer", () => (map.getCanvas().style.cursor = ""));
}

// ---------- Person layers ----------
async function addPersonLayers() {
  let data = await fetchGeoJSON(PERSON_URL);
  data = preprocessGeoJSONForTime(data);

  if (!map.getSource("person-collisions")) {
    map.addSource("person-collisions", { type: "geojson", data });
  }

  // Heatmap (low/mid zoom)
  if (!map.getLayer("person-collisions-heat")) {
    map.addLayer({
      id: "person-collisions-heat",
      type: "heatmap",
      source: "person-collisions",
      maxzoom: 13,
      paint: {
        "heatmap-weight": [
          "match",
          personSeverity,
          "Dead At Scene", 1.6,
          "Dead On Arrival", 1.6,
          "Died At Hospital", 1.6,
          "Serious Injury", 1.1,
          "Non Serious Injury (Evident Injury)", 0.85,
          "Possible Injury", 0.75,
          "No Injury", 0.55,
          "Unknown", 0.55,
          0.55,
        ],
        "heatmap-intensity": HEAT_INTENSITY,
        "heatmap-radius": HEAT_RADIUS,
        "heatmap-color": HEAT_COLOR_RAMP,
        "heatmap-opacity": HEAT_OPACITY,
      },
    });
  }

  // Circles (high zoom, clickable)
  if (!map.getLayer("person-collisions-layer")) {
    map.addLayer({
      id: "person-collisions-layer",
      type: "circle",
      source: "person-collisions",
      minzoom: 13,
      paint: {
        "circle-radius": 5,
        "circle-opacity": 0.9,
        "circle-color": [
          "match",
          personSeverity,
          "Dead At Scene", "red",
          "Dead On Arrival", "red",
          "Died At Hospital", "red",
          "Serious Injury", "orange",
          "Non Serious Injury (Evident Injury)", "yellow",
          "Possible Injury", "yellow",
          "No Injury", "#666",
          "Unknown", "#666",
          "#666",
        ],
        "circle-stroke-color": "#111",
        "circle-stroke-width": 0.6,
      },
    });
  }

  map.on("click", "person-collisions-layer", (e) => {
    const props = e.features?.[0]?.properties || {};
    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(`
        <div style="font-size:12px;line-height:1.4">
          <b>Incident Date:</b> ${propOrDash(props, "Incident Date")}<br>
          <b>Report #:</b> ${propOrDash(props, "Report Number")}<br>
          <b>Participant Type:</b> ${propOrDash(props, "Participant Type")}<br>
          <b>Age:</b> ${propOrDash(props, "Age")}<br>
          <b>Injury Severity:</b> ${propOrDash(props, "Injury Severity")}<br>
          <hr style="border:none;border-top:1px solid #ddd;margin:6px 0">
          <b>Pedestrian Action:</b> ${propOrDash(props, "Pedestrian Action")}<br>
          <b>Helmet Usage:</b> ${propOrDash(props, "Helmet Usage")}<br>
          <b>Clothing Visibility:</b> ${propOrDash(props, "Clothing Visibility")}<br>
        </div>
      `)
      .addTo(map);
  });

  map.on("mouseenter", "person-collisions-layer", () => (map.getCanvas().style.cursor = "pointer"));
  map.on("mouseleave", "person-collisions-layer", () => (map.getCanvas().style.cursor = ""));
}

// ---------- Time slider UI ----------
function setupTimeSlider() {
  if (!Number.isFinite(timeline.minTs) || !Number.isFinite(timeline.maxTs) || timeline.maxTs <= timeline.minTs) {
    console.warn("No valid date range found. Time slider not created.");
    return;
  }

  // Build day-index slider (0..N)
  const minTs = timeline.minTs;
  const maxTs = timeline.maxTs;
  const totalDays = Math.round((maxTs - minTs) / DAY_MS);

  // Create overlay UI inside the map container
  const container = map.getContainer();
  container.style.position = container.style.position || "relative";

  const overlay = document.createElement("div");
  overlay.style.position = "absolute";
  overlay.style.top = "12px";
  overlay.style.left = "12px";
  overlay.style.zIndex = "2";
  overlay.style.background = "rgba(255,255,255,0.95)";
  overlay.style.border = "1px solid rgba(0,0,0,0.12)";
  overlay.style.borderRadius = "10px";
  overlay.style.boxShadow = "0 2px 10px rgba(0,0,0,0.12)";
  overlay.style.padding = "10px 12px";
  overlay.style.width = "260px";
  overlay.style.font = "12px/1.3 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif";

  overlay.innerHTML = `
    <div style="font-weight:700; margin-bottom:6px;">Time filter</div>
    <div style="margin-bottom:6px;">
      <span style="opacity:0.7;">Showing up to:</span>
      <span id="time-label" style="font-weight:700;"></span>
    </div>
    <input id="time-slider" type="range" min="0" max="${totalDays}" step="1" value="${totalDays}" style="width:100%;">
    <div style="display:flex; justify-content:space-between; margin-top:6px; opacity:0.7;">
      <span>${formatISODate(minTs)}</span>
      <span>${formatISODate(maxTs)}</span>
    </div>
  `;

  container.appendChild(overlay);

  const labelEl = overlay.querySelector("#time-label");
  const sliderEl = overlay.querySelector("#time-slider");

  function setFromDayIndex(dayIdx) {
    const ts = minTs + dayIdx * DAY_MS;
    labelEl.textContent = formatISODate(ts);
    applyTimeFilter(ts);
  }

  // Initial = max (show everything)
  setFromDayIndex(totalDays);

  sliderEl.addEventListener("input", (e) => {
    const dayIdx = parseInt(e.target.value, 10);
    setFromDayIndex(dayIdx);
  });
}

// ---------- Optional toggles ----------
function wireLayerToggles() {
  const vehicles = document.getElementById("toggle-vehicles");
  const persons = document.getElementById("toggle-persons");

  if (vehicles) {
    vehicles.addEventListener("change", () => {
      const on = vehicles.checked;
      setLayerVisible("vehicle-collisions-heat", on);
      setLayerVisible("vehicle-collisions-layer", on);
    });
  }

  if (persons) {
    persons.addEventListener("change", () => {
      const on = persons.checked;
      setLayerVisible("person-collisions-heat", on);
      setLayerVisible("person-collisions-layer", on);
    });
  }
}
