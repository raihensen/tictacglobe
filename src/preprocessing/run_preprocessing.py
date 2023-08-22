
import preprocessing
import json
import pandas as pd

# Ensure we're running in the right directory
import os
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

def export_country_data():
    # Export country data
    countries = preprocessing.df.to_dict(orient="records")

    path = "../../data/countries.json"
    json.dump(countries, open(path, mode="w"))
    print(f"Exported country data to {path}")

df = preprocessing.df

print(df)

