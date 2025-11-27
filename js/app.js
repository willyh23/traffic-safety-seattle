
// Initialize the map
var map = L.map('map').setView([47.6062, -122.3321], 12); // Seattle center

// Mapbox basemap
L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: '© Mapbox © OpenStreetMap',
    tileSize: 512,
    zoomOffset: -1,
    id: 'mapbox://styles/willyh23/cmigyk5mh00bk01svavz7gxc9', // Replace with your Mapbox style ID
    accessToken: 'pk.eyJ1Ijoid2lsbHloMjMiLCJhIjoiY21obDBjN2ttMW1kdDJxcHI3a2s3YjR1dCJ9.1afNW3K_mxg4u55J1MPeaA' // Replace with your Mapbox token
}).addTo(map);

// --- Load GeoJSON layers ---
// Vehicle collisions
fetch('data/vehicle_collisions_filtered.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            pointToLayer: function(feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: 6,
                    fillColor: 'red',
                    color: '#fff',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                });
            },
            onEachFeature: function(feature, layer) {
                let props = feature.properties;
                layer.bindPopup(`
                    <b>Incident Date:</b> ${props["incident date"]}<br>
                    <b>Report #:</b> ${props["report number"]}<br>
                    <b>Vehicle Type:</b> ${props["vehicle type"]}<br>
                    <b>Action:</b> ${props["vehicle action description"]}<br>
                    <b>Traffic Control:</b> ${props["traffic control status or description"]}<br>
                    <b>Road Surface:</b> ${props["road surface type"]}<br>
                    <b>Posted Speed:</b> ${props["posted speed"]}<br>
                    <b>Vehicle Condition:</b> ${props["vehicle condition"]}<br>
                    <b>Source:</b> ${props["source description"]}
                `);
            }
        }).addTo(map);
    });

// Person collisions
fetch('data/person_collisions_filtered.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            pointToLayer: function(feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: 6,
                    fillColor: 'blue',
                    color: '#fff',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                });
            },
            onEachFeature: function(feature, layer) {
                let props = feature.properties;
                layer.bindPopup(`
                    <b>Incident Date:</b> ${props["incident date"]}<br>
                    <b>Report #:</b> ${props["report number"]}<br>
                    <b>Participant:</b> ${props["participant type"]}<br>
                    <b>Age:</b> ${props["age"]}<br>
                    <b>Gender:</b> ${props["gender"]}<br>
                    <b>Injury Severity:</b> ${props["injury severity"]}<br>
                    <b>Pedestrian Action:</b> ${props["pedestrian action"]}<br>
                    <b>Helmet Usage:</b> ${props["helmet usage"]}<br>
                    <b>Clothing Visibility:</b> ${props["clothing visibility"]}<br>
                    <b>Source:</b> ${props["source description"]}
                `);
            }
        }).addTo(map);
    });

// Traffic signals (context layer)
fetch('data/traffic_signals.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            pointToLayer: function(feature, latlng) {
                return L.marker(latlng, {
                    icon: L.icon({
                        iconUrl: 'icons/traffic-signal.png', // Add your custom icon
                        iconSize: [20, 20]
                    })
                });
            },
            onEachFeature: function(feature, layer) {
                let props = feature.properties;
                layer.bindPopup(`
                    <b>Signal ID:</b> ${props["UNITID"]}<br>
                    <b>Intersection:</b> ${props["UNITDESC"]}<br>
                    <b>Signal Type:</b> ${props["SIGNAL_TYPE"]}<br>
                    <b>Status:</b> ${props["CURRENT_STATUS"]}
                `);
            }
        }).addTo(map);
    });

// --- Prepare for Heatmap or Clustering ---
// You can use Leaflet plugins like leaflet.heat or leaflet.markercluster
// Example placeholder for heatmap initialization:
// var heatLayer = L.heatLayer([], { radius: 25 }).addTo(map);
// Later, push coordinates from your collision data into heatLayer
