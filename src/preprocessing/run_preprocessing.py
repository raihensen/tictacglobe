
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import tqdm

import preprocessing
from game import Constraint


df = preprocessing.df
categories = preprocessing.categories

# Ensure we're running in the right directory
import os
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# def export_country_data():
#     # Export country data
#     countries = preprocessing.df.to_dict(orient="records")

#     path = "../../data/countries.json"
#     json.dump(countries, open(path, mode="w"))
#     print(f"Exported country data to {path}")

# df = preprocessing.df

# print(df)


constraints = [
    # We always want a continent
    # Constraint.category_at_least("continent", 1),
    
    # Some categories are pretty boring to appear multiple times
    Constraint.category_at_most("capital_ending_letter", 1),
    Constraint.category_at_most("capital_starting_letter", 1),
    Constraint.category_at_most("ending_letter", 1)
]
CATEGORY_PROBS = {
    'continent': 4,
    'starting_letter': 3,
    'ending_letter': 1.5,
    'capital_starting_letter': 2,
    'capital_ending_letter': .5,
    'flag_colors': 3,
    'landlocked': 5,
    'island': 5
}

def generate_games(constraints, num):
    generator = preprocessing.get_generator(constraints, field_size=3,
                                            category_probs=CATEGORY_PROBS,
                                            seed=None, selection_mode="shuffle_setkeys", uniform=False, shuffle=True)
    return [generator.sample_game() for _ in tqdm.tqdm(range(num))]

games = generate_games(constraints, 500)

# Count category occurences
print(pd.Series(sum([[cat.key for cat, value in g.rows + g.cols] for g in games], [])).value_counts())

# for game in games[:20]:
#     print(game.to_dataframe(solution=True))
