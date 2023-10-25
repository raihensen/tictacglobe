
import re
import pandas as pd
from utils import *


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


def add_flag_colors(df):
    # Assign colors
    colors = pd.read_csv(
        "../../public/data/local/flag_colors/flag-colors.csv", sep=";")
    colors.columns = ["country", "color"]
    colors["country"].fillna(method='ffill', inplace=True)
    colors.dropna(inplace=True)
    colors = colors.applymap(lambda x: x.strip())
    # Apply name and color name maps
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

    cfre = re.compile(r"^(?:(?:\[(?P<main_set>[^\(\)]*)\])|(?:(?P<main_add>[^\(\)]*)))?(?:,?\s*\((?P<optional>[^\(\)]*?)\))?,?\s*(?:\(\((?P<ignore>[^\(\)]*?)\)\))?$")


    color_fixes = open("../../public/data/local/flag_colors/flag color fixes.txt").read().split("\n")
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

    # print("Adjusted flag colors:")
    # print(df[df["iso"].isin(changes)][["iso", "name", "flag_colors", "flag_colors_alt"]])
    return df

