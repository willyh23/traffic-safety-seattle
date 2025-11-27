
import json

# Input and output file names
input_file = "vehicle_collisions.geojson"
output_file = "vehicle_collisions_filtered.geojson"

# Relevant fields
RELEVANT_FIELDS = [
    "INCDATE", "INCDTTM", "REPORTNO",
    "ST_VEH_TYPE_DESC", "ST_VEH_ACT_DESC",
    "ST_TRAFCONTRL_DESC", "ST_RDSURF_DESC",
    "ST_POSTEDSPD", "ST_VEH_CND_DESC", "SOURCEDESC"
]

# Load GeoJSON
with open(input_file, "r") as f:
    data = json.load(f)

# Filter properties
for feature in data.get("features", []):
    props = feature.get("properties", {})
    filtered_props = {field: (props.get(field) if props.get(field) not in [None, "", "null"] else "null") for field in RELEVANT_FIELDS}
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

print(f"✅ Filtered GeoJSON saved as {output_file}")
