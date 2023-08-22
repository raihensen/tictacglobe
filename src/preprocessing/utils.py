

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

