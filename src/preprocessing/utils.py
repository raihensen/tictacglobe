

def get_country_index(df, c):
    if c in df["name"].values:
        return df.index[df["name"] == c][0]
    if c in df["iso"].values:
        return df.index[df["iso"] == c][0]
    return None


def add_alternative_value(df, col, country, *values):
    cols = list(df.columns)
    if col not in cols:
        return False
    
    # Add alternative column if not exists
    altcol = col + "_alt"
    if altcol not in cols:
        df.insert(cols.index(col) + 1, altcol, df[col].apply(lambda x: []))
    
    # Find country
    index = get_country_index(df, country)
    if index is None:
        print(f"country {country} not found!")
        return False
    
    # Add values
    values = sum([[x] if not isinstance(x, list) else x for x in values], [])
    
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


def set_border(df, c1, c2, border=True, alt_border=False):
    i1, i2 = get_country_index(df, c1), get_country_index(df, c2)
    if i1 is None or i2 is None:
        print(f"countries {c1} / {c2} not found!")
        return
    if border and alt_border:
        print("Cannot set both border and alt_border relation.")
        return
    iso1, iso2 = df.loc[i1, "iso"], df.loc[i2, "iso"]
    df.at[i1, "neighbors"] = list(sorted(set(df.at[i1, "neighbors"]).difference({iso2}).union({iso2} if border else {})))
    df.at[i2, "neighbors"] = list(sorted(set(df.at[i2, "neighbors"]).difference({iso1}).union({iso1} if border else {})))
    df.at[i1, "neighbors_alt"] = list(sorted(set(df.at[i1, "neighbors_alt"]).difference({iso2}).union({iso2} if alt_border else {})))
    df.at[i2, "neighbors_alt"] = list(sorted(set(df.at[i2, "neighbors_alt"]).difference({iso1}).union({iso1} if alt_border else {})))


def add_border(df, c1, c2):
    set_border(df, c1, c2, border=True, alt_border=False)

def add_alternative_border(df, c1, c2):
    set_border(df, c1, c2, border=False, alt_border=True)

def remove_border(df, c1, c2):
    set_border(df, c1, c2, border=False, alt_border=False)


def camel_case(s: str) -> str:
    output = ''.join(x for x in s.title() if x.isalnum())
    return output[0].lower() + output[1:]
