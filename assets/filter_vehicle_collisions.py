
import json
from datetime import datetime

# Input and output file names
input_file = "vehicle_collisions.geojson"
output_file = "vehicle_collisions_filtered.geojson"

# Mapping of original fields to new readable names
FIELD_MAPPING = {
    "INCDATE": "Incident Date",
    "REPORTNO": "Report Number",
    "ST_VEH_TYPE_DESC": "Vehicle Type",
    "ST_VEH_ACT_DESC": "Vehicle Action Description",
    "ST_TRAFCONTRL_DESC": "Traffic Control Status",
    "ST_RDSURF_DESC": "Road Surface Type",
    "ST_POSTEDSPD": "Posted Speed",
    "ST_VEH_CND_DESC": "Vehicle Condition",
    "SOURCEDESC": "Source Description"
}

def format_date(date_str):
    try:
        # Parse date ignoring time
        dt = datetime.strptime(date_str, "%a, %d %b %Y %H:%M:%S GMT")
        return dt.strftime("%Y-%m-%d")
    except:
        return date_str  # If parsing fails, return original

# Load GeoJSON
with open(input_file, "r") as f:
    data = json.load(f)

# Filter and rename properties
for feature in data.get("features", []):
    props = feature.get("properties", {})
    filtered_props = {}
    for original, new_name in FIELD_MAPPING.items():
        value = props.get(original)
        if original == "INCDATE" and value not in [None, "", "NA"]:
            value = format_date(value)
        filtered_props[new_name] = value if value not in [None, "", "NA"] else "NA"
    feature["properties"] = filtered_props

# Add CRS if missing
if "crs" not in data:
    data["crs"] = {
        "type": "name",
        "properties": {"name": "EPSG:4326"}
    }

# Save pretty-printed GeoJSON
with open(output_file, "w") as f:
    json.dump(data, f, indent=2)

print(f"✅ Filtered and renamed GeoJSON saved as {output_file}")
