
FIELD_SIZE = 3
MIN_CELL_SIZE = 1
MAX_CELL_SIZE = 10

import json
import pandas as pd
import itertools
from game import *
from category import *
from utils import *

# Ensure we're running in the right directory
import os
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# IDEAS
# 3 difficulty levels
# category flag has star/crest/moon
# northern/southern hemisphere
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

subset = ['iso', 'iso3', 'name', 'capital', 'continent',
          'area_km2', 'population',
          'currency_code', 'currency_name', 'languages',
          'territories', 'neighbors', 'neighbors_t']
df = df[subset]
# df.rename(columns={"neighbors_t": "neighbors"}, inplace=True)
Game.values = df[["iso", "name"]].to_dict(orient="records")

# Import GDP data
# GDP data from https://github.com/datasets/gdp/blob/master/data/gdp.csv
gdp_data = pd.read_csv("../../data/local/gdp.csv")
gdp = gdp_data.sort_values("Year").groupby("Country Code").tail(1).set_index("Country Code").rename(columns={"Value": "gdp"})
df = df.join(gdp["gdp"], on="iso3")
# print("no gdp data:")
# print(df[df["gdp"].isna()][["iso", "name", "population", "gdp"]])
df.loc[df.iso == "TW", "gdp"] = 790.7e9  # https://en.wikipedia.org/wiki/Economy_of_Taiwan (2023 data, accessed Aug 2023)
df.loc[df.iso == "KP", "gdp"] = 28.5e9  # https://en.wikipedia.org/wiki/Economy_of_North_Korea (2016 data, accessed Aug 2023)
df["gdp_per_capita"] = df["gdp"] / df["population"]
df.loc[df.iso == "VA", "gdp_per_capita"] = 21198  #  https://en.wikipedia.org/wiki/Economy_of_Vatican_City (2016 data, accessed Aug 2023)
df["gdp"] = df["gdp_per_capita"] * df["population"]

# Individual fixes
df.loc[df["name"] == "Palau", "capital"] = "Ngerulmud"  # old value seems wrong

# Consider territorial borders as alternative values (e.g. France-Brazil)
neighbors_alt = df.apply(lambda row: [c for c in row["neighbors_t"] if c not in row["neighbors"]], axis=1)
df.drop(columns=["neighbors_t"], inplace=True)
df.insert(list(df.columns).index("neighbors") + 1, "neighbors_alt", neighbors_alt)

# Border fixes
remove_border(df, "US", "Cuba")  # not so narrow maritime border
remove_border(df, "US", "Bahamas")  # not so narrow maritime border
add_alternative_border(df, "Singapore", "Malaysia")  # narrow maritime border
add_alternative_border(df, "Spain", "Morocco")  # Ceuta/Melilla provinces

# Additional columns & global fixes
df["continent"].fillna("NA", inplace=True)  # North America fix
df["landlocked"] = df["iso"].isin("AF,AD,AM,AT,AZ,BY,BT,BO,BW,BF,BI,CF,TD,CZ,SZ,ET,HU,KZ,XK,KG,LA,LS,LI,LU,MW,ML,MD,MN,NP,NE,MK,PY,RW,SM,RS,SK,SS,CH,TJ,TM,UG,UZ,VA,ZM,ZW".split(","))
df["island"] = (df["neighbors"].apply(len) == 0) | df["iso"].isin("ID,PG,TL,SG,BN,GB,IE,DO,HT".split(","))
add_alternative_value(df, "island", "Australia", False, True)

# Alternative values
# Names
add_alternative_value(df, "name", "CI", "Ivory Coast", "Côte d'Ivoire")
add_alternative_value(df, "name", "MK", "North Macedonia", "Macedonia")
add_alternative_value(df, "name", "PS", "Palestine", "Palestinian Territory")
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

# Borders
add_alternative_value(df, "name", "CI", "Ivory Coast", "Côte d'Ivoire")

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

# ------------------------------------------------------------------------------------------------------------------
# Import flag colors
from colors import add_flag_colors
df = add_flag_colors(df)

# ------------------------------------------------------------------------------------------------------------------
# Categories

categories = [
    NominalCategory(df, key="continent", name="Continent", difficulty=1, col="continent"),
    NominalCategory(df, key="starting_letter", name="Starting letter", difficulty=1, col="name", extractor=lambda x: x[0].upper()),
    NominalCategory(df, key="ending_letter", name="Ending letter", difficulty=2, col="name", extractor=lambda x: x[-1].upper()),
    NominalCategory(df, key="capital_starting_letter", name="Capital starting letter", difficulty=1.5, col="capital", extractor=lambda x: x[0].upper()),
    NominalCategory(df, key="capital_ending_letter", name="Capital ending letter", difficulty=3, col="capital", extractor=lambda x: x[-1].upper()),
    MultiNominalCategory(df, key="flag_colors", name="Flag color", difficulty=1.5, col="flag_colors"),
    BooleanCategory(df, key="landlocked", name="Landlocked", difficulty=2, col="landlocked"),
    BooleanCategory(df, key="island", name="Island Nation", difficulty=1.5, col="island"),
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
    elif isinstance(cat, BooleanCategory):
        # only consider True values. The False group does not yield a catset
        cat.sets = values.groupby(by=cat.key)["iso"].agg(sorted)
        cat.sets = cat.sets[cat.sets.index]
        cat.alt_sets = values.explode(column=cat.alt_key).groupby(by=cat.alt_key)["iso"].agg(sorted)
        cat.alt_sets = cat.alt_sets[cat.alt_sets.index]

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

print("Categories:")
print(list(categories.values()))


# ------------------------------------------------------------------------------------------------------------------
# Init setkeys & cells

import matplotlib.pyplot as plt

setkeys = sum([[(cat.key, value) for value in cat.sets.index] for cat in categories.values()], [])
cells = {}
for (key1, value1), (key2, value2) in itertools.combinations(setkeys, 2):
    if is_cell_allowed(key1, value1, key2, value2, categories=categories):
        row, col = (key1, value1), (key2, value2)
        if row < col:  # changed: row has the lexicographically smaller (key, value) pair
            row, col = col, row
        cells[(row, col)] = init_cell_contents(*row, *col, df=df, categories=categories)

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

# def create_game(constraints, shuffle=True):
#     return sample_game(categories, setkeys, cells,
#                        field_size=FIELD_SIZE, constraints=constraints, shuffle=shuffle)

def get_generator(constraints, field_size, seed=None, selection_mode="shuffle_categories", uniform=False, shuffle=True):
    return GameGenerator(categories=categories,
                         setkeys=setkeys,
                         cells=cells,
                         field_size=field_size,
                         constraints=constraints,
                         seed=seed,
                         selection_mode=selection_mode,
                         uniform=uniform,
                         shuffle=shuffle)

