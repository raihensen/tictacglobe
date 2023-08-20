
FIELD_SIZE = 3
MIN_CELL_SIZE = 1
MAX_CELL_SIZE = 10

import json
import pandas as pd
import itertools
from game import *
from category import *

# Ensure we're running in the right directory
import os
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# IDEAS
# category flag has star/crest/moon
# flag has only 2 colors
# flag is blue white red
# limit number of cells a country appears in

# ------------------------------------------------------------------------------------------------------------------
# Import data
import os
print(os.getcwd())
data = json.load(open("../../data/local/countries_processed.json", encoding="utf-8"))
df = pd.DataFrame(data)

# Filter & rename columns
df.columns = ['iso', 'iso3', 'iso_numeric', 'fips', 'name', 'capital',
              'area_km2', 'population', 'continent', 'tld',
              'currency_code', 'currency_name', 'phone', 'zip_format', 'zip_regex',
              'languages', 'geonameid', 'neighbors', 'eq_fips', 'parent', 'territories', 'neighbors_t']
subset = ['iso', 'name', 'capital', 'continent',
          'area_km2', 'population',
          'currency_code', 'currency_name', 'languages',
          'territories', 'neighbors_t']
df = df[subset]
df.rename(columns={"neighbors_t": "neighbors"}, inplace=True)
Game.values = df[["iso", "name"]].to_dict(orient="records")

# Additional columns & global fixes
df["continent"].fillna("NA", inplace=True)  # North America fix
df["landlocked"] = df["iso"].isin("AF,AD,AM,AT,AZ,BY,BT,BO,BW,BF,BI,CF,TD,CZ,SZ,ET,HU,KZ,XK,LA,LS,LI,LU,MW,ML,MD,MN,NP,NE,MK,PY,RW,SM,RS,SK,SS,CH,TJ,UG,VA,ZA,ZW".split(","))
df["island"] = df["neighbors"].apply(len) == 0

def add_alternative_value(df, col, country, *values):
    cols = list(df.columns)
    if col not in cols:
        return False
    
    # Add alternative column if not exists
    altcol = col + "_alt"
    if altcol not in cols:
        df.insert(cols.index(col) + 1, altcol, df[col].apply(lambda x: []))
    
    # Find country
    if country in df["name"].values:
        index = df.index[df["name"] == country][0]
    elif country in df["iso"].values:
        index = df.index[df["iso"] == country][0]
    else:
        print(f"country {country} not found!")
        return False
    
    # Add values
    values = sum([[x] if not isinstance(x, list) else x for x in values], [])
#     values = [val for val in values if val not in df.loc[index, altcol]]
    
    # Warn if value to-be-added is the actual value. Swap if not first-named
    if df.loc[index, col] in values:
        if values[0] == df.loc[index, col]:
            print(f"{country}/{col}: '{df.loc[index, col]}' is already set as main value - skipping")
        else:
            print(f"{country}/{col}: '{df.loc[index, col]}' is already set as main value - swapping with '{values[0]}'")
            df.loc[index, col] = values[0]
        values = values[1:]

    for val in values:
        if val not in df.loc[index, altcol]:
            df.loc[index, altcol].append(val)
    return True

# Individual fixes
df.loc[df["name"] == "Palau", "capital"] = "Ngerulmud"
df.loc[df["iso"] == "PS", "name"] = "Palestine"

# Alternative values
# Names
add_alternative_value(df, "name", "CI", "Ivory Coast", "Côte d'Ivoire")
add_alternative_value(df, "name", "TR", "Türkiye", "Turkey")
add_alternative_value(df, "name", "VA", "Vatican", "Vatican City")
add_alternative_value(df, "name", "US", "United States", "United States of America")
add_alternative_value(df, "name", "CZ", "Czech Republic", "Czechia")

# Multiple continents (source: https://en.wikipedia.org/wiki/List_of_transcontinental_countries)
add_alternative_value(df, "continent", "Armenia", "AS", "EU")
add_alternative_value(df, "continent", "Georgia", "AS", "EU")
add_alternative_value(df, "continent", "Azerbaijan", "AS", "EU")
add_alternative_value(df, "continent", "Trinidad and Tobago", "NA", "SA")
add_alternative_value(df, "continent", "Panama", "NA", "SA")
add_alternative_value(df, "continent", "Egypt", "AF", "AS")
add_alternative_value(df, "continent", "Russia", "EU", "AS")
add_alternative_value(df, "continent", "TR", "AS", "EU")
add_alternative_value(df, "continent", "Timor Leste", "AS", "OC")

# Multiple/unclear capital (source: https://en.wikipedia.org/wiki/List_of_countries_with_multiple_capitals)
add_alternative_value(df, "capital", "Kazakhstan", "Astana", "Nur-Sultan")
add_alternative_value(df, "capital", "Bolivia", "La Paz", "Sucre")
add_alternative_value(df, "capital", "Burundi", "Gitega", "Bujumbura")
add_alternative_value(df, "capital", "CI", "Yamoussoukro", "Abidjan")
add_alternative_value(df, "capital", "Eswatini", "Mbabane", "Lobamba")
add_alternative_value(df, "capital", "Malaysia", "Kuala Lumpur", "Putrajaya")
add_alternative_value(df, "capital", "Netherlands", "Amsterdam", "The Hague")
add_alternative_value(df, "capital", "Palestine", "Ramallah", "Jerusalem", "East Jerusalem")
add_alternative_value(df, "capital", "South Africa", "Pretoria", "Cape Town", "Bloemfontein")
add_alternative_value(df, "capital", "Sri Lanka", "Colombo", "Sri Jayawardenepura Kotte")

# Capitals with multiple spellings / alternative names
add_alternative_value(df, "capital", "US", "Washington", "Washington, DC")
add_alternative_value(df, "capital", "Chile", "Santiago", "Santiago de Chile")


# Display all changes
altcols = [col for col in df.columns if col.endswith("_alt")]
print("\nAll countries with alternative values:")
print(df[df[altcols].applymap(len).sum(axis=1) > 0])

# df.reset_index(inplace=True)
# df

# ------------------------------------------------------------------------------------------------------------------
# Import flag colors
# Assign colors
colors = pd.read_csv("../../data/local/flag-colors.csv", sep=";")
colors.columns = ["country", "color"]
colors["country"].fillna(method='ffill', inplace=True)
colors.dropna(inplace=True)
colors = colors.applymap(lambda x: x.strip())


cmap = {
    "Light Blue": "Blue",
    "Dark Blue": "Blue",
    "Sky Blue": "Blue",
    "Aquamarine Blue": "Blue",
    "Fulvous": "Orange",
    "Crimson": "Red",
    "Saffron Orange": "Orange",
    "Green Or Blue": "Green",
    "Maroon": "Red",  # Qatar, Sri Lanka,
    "Olive Green": "Green",
    "Yellow": "Yellow/Gold",
    "Gold": "Yellow/Gold",
    "Golden": "Yellow/Gold",
}
name_map = {
    'American Samoa': None,
    'Anguilla': None,
    'Antigua And Barbuda': 'Antigua and Barbuda',
    'Aruba': None,
    'Bermuda': None,
    'Bosnia And Herzegovina': 'Bosnia and Herzegovina',
    'Bouvet Island': None,
    'Brunei Darussalam': "Brunei",
    "Czechia": "Czech Republic",
    'Cook Islands': None,
    'Curaçao': None,
    "Côte D'Ivoire": 'Ivory Coast',
    'Democratic Republic Of The Congo': 'Democratic Republic of the Congo',
    'French Polynesia': None,
    'Holy See (Vatican City State)': "Vatican",
    'Niue': None,
    'Norfolk Island': None,
#     'Palestine': 'Palestinian Territory',
    'Pitcairn Islands': None,
    'Republic Of The Congo': 'Republic of the Congo',
    'Russian Federation': "Russia",
    'Saint Kitts And Nevis': 'Saint Kitts and Nevis',
    'Saint Vincent And The Grenadines': 'Saint Vincent and the Grenadines',
    'Sao Tome And Principe': 'Sao Tome and Principe',
    'Syrian Arab Republic': "Syria",
    'Tanzania, United Republic Of': "Tanzania",
    'Trinidad And Tobago': 'Trinidad and Tobago',
    'Åland Islands': None,
    'Turkey': 'Türkiye'
}
add = [
    {"country": "Timor Leste", "color": ["Red", "Yellow/Gold", "Black", "White"]},
    {"country": "Kosovo", "color": ["Blue", "Yellow/Gold", "White"]},
    {"country": "Taiwan", "color": ["Red", "Blue", "White"]}
]

colors["color"] = colors["color"].apply(lambda c: cmap.get(c, c))
colors["country"] = colors["country"].apply(lambda x: name_map.get(x, x))
colors1 = colors.groupby(by="country")["color"].agg(list).reset_index()
colors1 = colors1.append(add, ignore_index=True)

colors2 = pd.merge(df[["name"]], colors1, how="left", left_on="name", right_on="country")
colors2_outer = pd.merge(df[["name"]], colors1, how="outer", left_on="name", right_on="country", indicator=True)
df["flag_colors"] = colors2["color"]
df["flag_colors"] = df["flag_colors"].apply(lambda cc: list(set(cc)))

no_flag = df["flag_colors"].isna().sum()
print(f"Assigned colors. {no_flag} countries missing a flag.")

# ------------------------------------------------------------------------------------------------------------------
# Flag color fixes
import re

cfre = re.compile(r"^(?:(?:\[(?P<main_set>[^\(\)]*)\])|(?:(?P<main_add>[^\(\)]*)))?(?:,?\s*\((?P<optional>[^\(\)]*?)\))?,?\s*(?:\(\((?P<ignore>[^\(\)]*?)\)\))?$")

def parse_color(c):
    cmap = {"Y/G": "Yellow/Gold", "R": "Red", "W": "White", "B": "Blue", "Gr": "Green", "O": "Orange"}
    return cmap.get(c, c)
    
def parse_fixes(specs):
    for line in specs:
        iso = line[:2]
        spec = line[3:]
        match = cfre.match(spec)
        if match:
            for mode, cc in match.groupdict().items():
                if cc:
                    yield (iso, mode, [parse_color(c.strip()) for c in cc.split(",")])
        else:
            print(spec, "no match")

color_fixes = open("../../data/local/flag color fixes.txt").read().split("\n")
color_fixes = list(parse_fixes(color_fixes))

# Apply the fixes
for iso, mode, cc in color_fixes:
    if iso not in df["iso"].values:
        print(f"Country {iso} not found.")
        continue
    index = df.index[df["iso"] == iso][0]
    if mode == "main_set":
        df.at[index, "flag_colors"] = cc
    elif mode == "main_add":
        for c in cc:
            df.loc[index, "flag_colors"].append(c)
    elif mode == "optional":
        add_alternative_value(df, "flag_colors", iso, *cc)

df["flag_colors"] = df["flag_colors"].apply(lambda cc: list(sorted(set(cc))))
if "flag_colors_alt" in list(df.columns):
    df["flag_colors_alt"] = df["flag_colors_alt"].apply(lambda cc: list(sorted(set(cc))))

changes = set(iso for iso, _, _ in color_fixes)    

print("Adjusted flag colors:")
print(df[df["iso"].isin(changes)][["iso", "name", "flag_colors", "flag_colors_alt"]])

# ------------------------------------------------------------------------------------------------------------------
# Categories

categories = [
    NominalCategory(df, key="continent", name="Continent", difficulty=1, col="continent"),
    NominalCategory(df, key="starting_letter", name="Starting letter", difficulty=1, col="name", extractor=lambda x: x[0].upper()),
    NominalCategory(df, key="ending_letter", name="Ending letter", difficulty=2, col="name", extractor=lambda x: x[-1].upper()),
    NominalCategory(df, key="capital_starting_letter", name="Capital starting letter", difficulty=1.5, col="capital", extractor=lambda x: x[0].upper()),
    NominalCategory(df, key="capital_ending_letter", name="Capital ending letter", difficulty=3, col="capital", extractor=lambda x: x[-1].upper()),
    MultiNominalCategory(df, key="flag_colors", name="Flag color", difficulty=1.5, col="flag_colors"),
]
categories = {cat.key: cat for cat in categories}

# bool_categories = {
#     "Island": df["neighbours"].apply(lambda x: not x),
#     "Landlocked": None,
#     "Top 10 Area": df.ISO.isin(df.nlargest(10, 'Area(in sq km)').ISO),
#     "Bottom 10 Area": df.ISO.isin(df.nsmallest(10, 'Area(in sq km)').ISO),
#     "Top 10 Pop.": df.ISO.isin(df.nlargest(10, 'Population').ISO),
#     "Bottom 10 Pop.": df.ISO.isin(df.nsmallest(10, 'Population').ISO),
# }

values = pd.concat([
    df[["iso", "name"]],
    pd.DataFrame({cat.key: cat.values for cat in categories.values()}),
    pd.DataFrame({cat.alt_key: cat.alt_values for cat in categories.values() if cat.alt_values is not None}),
#     pd.DataFrame(bool_categories)
], axis=1)

# values[values[[cat.alt_key for cat in categories.values()]].applymap(len).sum(axis=1) > 0]


# ------------------------------------------------------------------------------------------------------------------
# Generate category value lists and filter out infrequent values

for cat in categories.values():
    if isinstance(cat, NominalCategory):
        cat.sets = values.groupby(by=cat.key)["iso"].agg(sorted)
        cat.alt_sets = values.explode(column=cat.alt_key).groupby(by=cat.alt_key)["iso"].agg(sorted)
    elif isinstance(cat, MultiNominalCategory):
        cat.sets = values.explode(column=cat.key).groupby(by=cat.key)["iso"].agg(sorted)
        cat.alt_sets = values.explode(column=cat.alt_key).groupby(by=cat.alt_key)["iso"].agg(sorted)

while True:
    # Retain only sets with at least 3 (FIELD_SIZE) elements
    num_sets_0 = sum(len(cat.sets) for cat in categories.values())
    for cat in categories.values():
        cat.sets = cat.sets[cat.sets.apply(len) >= FIELD_SIZE]
    num_sets_1 = sum(len(cat.sets) for cat in categories.values())
    if num_sets_0 != num_sets_1:
        print(f"Removed {num_sets_0 - num_sets_1} category sets")
    # Retain only countries contained in sets of at least 2 different categories (-> has matching row+column)
    category_contents = {cat.key: cat.sets.sum() for cat in categories.values()}
    # {cat: len(cc) for cat, cc in category_contents.items()}
    contents = set().union(*[set(cc) for cc in category_contents.values()])
    print("contents:", len(contents))
    retain = {c for c in contents if len([key for key, cc in category_contents.items() if c in cc]) >= 2}
    print("retain:", len(retain))
    remove = contents.difference(retain)
    
    for cat in categories.values():
        cat.sets = cat.sets.apply(lambda cc: [c for c in cc if c in retain])
    if not remove:
        print("No countries to remove")
        break
    print(f"Removed {len(remove)} countries:", remove)
    print("Repeat ...")

list(categories.values())


# ------------------------------------------------------------------------------------------------------------------
# Init setkeys & cells

import matplotlib.pyplot as plt

setkeys = sum([[(cat.key, value) for value in cat.sets.index] for cat in categories.values()], [])
cells = {(min_set(row, col), max_set(row, col)): init_cell_contents(*row, *col, df=df, categories=categories)
         for row, col in itertools.combinations(setkeys, 2) if is_cell_allowed(*row, *col, categories=categories)}

print(f"Generated {len(setkeys)} sets and {len(cells)} cells")

# Bring cells to DataFrame to do filtering (cell size etc.)
cell_info = pd.DataFrame([{"row_cat": row[0], "row_val": row[1],
                           "col_cat": col[0], "col_val": col[1],
                           "contents": contents, "alt_contents": init_cell_contents(*row, *col, alt=True, df=df, categories=categories)} for (row, col), contents in cells.items()])
cell_info["size"] = cell_info["contents"].apply(len)

# display(cell_info[cell_info["row_cat"] == cell_info["col_cat"]])

# Filter cells w.r.t. number of solutions
cell_info = cell_info[(cell_info["size"] >= MIN_CELL_SIZE) & (cell_info["size"] <= MAX_CELL_SIZE)]
cell_keys = cell_info.apply(lambda row: ((row["row_cat"], row["row_val"]), (row["col_cat"], row["col_val"])), axis=1)
cells = {key: (contents, alt_contents) for key, contents, alt_contents in zip(cell_keys, cell_info["contents"], cell_info["alt_contents"])}
setkeys_old = setkeys
setkeys = list(sorted(set(pd.concat([cell_keys.apply(lambda c: c[0]), cell_keys.apply(lambda c: c[1])]).tolist())))

print(f"Retained {len(cells)} cells (of size {MIN_CELL_SIZE}-{MAX_CELL_SIZE})")
if len(setkeys) < len(setkeys_old):
    print(f"This lead to the removal of {len(setkeys_old) - len(setkeys)} key/value sets.")

# plt.hist(cell_info["size"], rwidth=.9, bins=[x-.5 for x in range(cell_info["size"].min(), cell_info["size"].max() + 1)])
# plt.title("Distribution of cell sizes")
# plt.show()

# ------------------------------------------------------------------------------------------------------------------
# Sample games

def create_game(constraints, shuffle=True):
    return sample_game(categories, setkeys, cells,
                       field_size=FIELD_SIZE, constraints=constraints, shuffle=shuffle)


