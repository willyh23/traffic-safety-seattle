
mapboxgl.accessToken = 'pk.eyJ1IjoieWowNTA1IiwiYSI6ImNtaGVhZm13NzBiZHAyaXBwNnVia3kyY3YifQ.JDOB2t61C-q1Qo7WLT7DDw';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10', // Your custom Mapbox style
    center: [-122.3321, 47.6062], // Seattle
    zoom: 10.5
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
                        <b>Incident Date:</b> ${props["Incident Date"]}<br>
                        <b>Report #:</b> ${props["Report Number"]}<br>
                        <b>Vehicle Type:</b> ${props["Vehicle Type"]}<br>
                    `)
                    .addTo(map);
            });
            

            map.on('mouseenter', 'vehicle-collisions-layer', () => map.getCanvas().style.cursor = 'pointer');
            map.on('mouseleave', 'vehicle-collisions-layer', () => map.getCanvas().style.cursor = '');
        });
});
