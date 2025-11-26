
import pandas as pd
import geojson
import os

def csv_to_geojson(csv_file, output_file):
    print(f"Processing file: {csv_file}")
    
    # Read the CSV file
    try:
        df = pd.read_csv(csv_file)
    except Exception as e:
        print(f"Error reading {csv_file}: {e}")
        return

    # Ensure x/y columns exist
    if 'x' not in df.columns or 'y' not in df.columns:
        print(f"Skipping {csv_file}: Missing 'x' and 'y' columns.")
        return

    # Create GeoJSON features
    features = []
    for _, row in df.iterrows():
        point = geojson.Point((row['x'], row['y']))
        properties = row.drop(['x', 'y']).to_dict()
        features.append(geojson.Feature(geometry=point, properties=properties))

    # Create FeatureCollection
    feature_collection = geojson.FeatureCollection(features)

    # Save to GeoJSON file
    try:
        with open(output_file, 'w') as f:
            geojson.dump(feature_collection, f)
        print(f"✅ Successfully created: {output_file}")
    except Exception as e:
        print(f"Error writing {output_file}: {e}")

# Files to convert
files_to_convert = [
    "SDOT_Collisions_Persons.csv",
    "SDOT_Collisions_Vehicles.csv"
]

print("Starting conversion...")
print("Found files:", files_to_convert)

for csv_file in files_to_convert:
    if os.path.exists(csv_file):
        output_file = os.path.splitext(csv_file)[0] + ".geojson"
        csv_to_geojson(csv_file, output_file)
    else:
        print(f"❌ File not found: {csv_file}")

print("Conversion process completed.")
