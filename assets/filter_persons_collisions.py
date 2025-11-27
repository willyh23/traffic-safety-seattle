
import json
from datetime import datetime

# Input and output file names
input_file = "persons_collisions.geojson"
output_file = "persons_collisions_filtered.geojson"

# Mapping of original fields to new readable names
FIELD_MAPPING = {
    "INCDATE": "Incident Date",
    "REPORTNO": "Report Number",
    "ST_PARTCPNT_TYPE_DESC": "Participant Type",
    "ST_AGE": "Age",
    "ST_INJRY_CLSS_DESC": "Injury Severity",
    "ST_PED_ACT_DESC": "Pedestrian Action",
    "ST_HELMET_DESC": "Helmet Usage",
    "ST_CLTHNG_VSBLTY_DESC": "Clothing Visibility",
    "SOURCEDESC": "Source Description"
}

def format_date(date_str):
    try:
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
        if original == "INCDATE" and value not in [None, "", "null"]:
            value = format_date(value)
        filtered_props[new_name] = value if value not in [None, "", "null"] else "NA"
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
