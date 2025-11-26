
import pandas as pd
from geopy.geocoders import Nominatim
import time

# Load traffic signals CSV
df = pd.read_csv("Traffic_Signal_Assemblies_CDL.csv")

# Initialize geocoder
geolocator = Nominatim(user_agent="traffic_signals_geocoder")

latitudes = []
longitudes = []

for address in df['unitdesc']:
    try:
        # Add city and state for better accuracy
        location = geolocator.geocode(f"{address}, Seattle, WA")
        if location:
            latitudes.append(location.latitude)
            longitudes.append(location.longitude)
        else:
            latitudes.append(None)
            longitudes.append(None)
    except Exception as e:
        print(f"Error geocoding {address}: {e}")
        latitudes.append(None)
        longitudes.append(None)
    
    time.sleep(1)  # Respect Nominatim's rate limit

# Add lat/lon to DataFrame
df['lat'] = latitudes
df['lon'] = longitudes

# Save updated CSV
df.to_csv("Traffic_Signal_Assemblies_CDL_geocoded.csv", index=False)
print("✅ Geocoding complete! Saved as Traffic_Signal_Assemblies_CDL_geocoded.csv")
