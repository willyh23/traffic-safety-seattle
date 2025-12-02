
mapboxgl.accessToken = 'pk.eyJ1Ijoid2lsbHloMjMiLCJhIjoiY21obDBjN2ttMW1kdDJxcHI3a2s3YjR1dCJ9.1afNW3K_mxg4u55J1MPeaA';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/willyh23/cmigyk5mh00bk01svavz7gxc9', // Your custom Mapbox style
    center: [-122.3321, 47.6062], // Seattle
    zoom: 12
});

map.addControl(new mapboxgl.NavigationControl());

map.on('load', () => {
    // Load collision data
    fetch('assets/vehicle_collisions_filtered.geojson')
        .then(res => res.json())
        .then(data => {
            map.addSource('vehicle-collisions', { type: 'geojson', data: data });
            map.addLayer({
                id: 'vehicle-collisions-layer',
                type: 'circle',
                source: 'vehicle-collisions',
                paint: {
                    'circle-radius': 6,
                    'circle-color': [
                        'match',
                        ['get', 'injury severity'],
                        'Fatal', 'red',
                        'Serious', 'orange',
                        'Minor', 'yellow',
                        '#888'
                    ],
                    'circle-stroke-color': '#fff',
                    'circle-stroke-width': 1
                }
            });

            map.on('click', 'vehicle-collisions-layer', (e) => {
                const props = e.features[0].properties;
                new mapboxgl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(`
                        <b>Incident Date:</b> ${props["incident date"]}<br>
                        <b>Report #:</b> ${props["report number"]}<br>
                        <b>Vehicle Type:</b> ${props["vehicle type"]}<br>
                        <b>Severity:</b> ${props["injury severity"]}
                    `)
                    .addTo(map);
            });

            map.on('mouseenter', 'vehicle-collisions-layer', () => map.getCanvas().style.cursor = 'pointer');
            map.on('mouseleave', 'vehicle-collisions-layer', () => map.getCanvas().style.cursor = '');
        });
});
