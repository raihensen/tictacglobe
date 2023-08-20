
import preprocessing
import json

# Export country data
countries = preprocessing.df.to_dict(orient="records")

path = "../../data/countries.json"
json.dump(countries, open(path, mode="w"))
print(f"Exported country data to {path}")




