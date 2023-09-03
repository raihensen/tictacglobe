
import json
import datetime

import preprocessing
from generator import Constraint, GameGenerator
from difficulty import compute_game_difficulties, DifficultyLevel

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
    # Some categories are pretty boring to appear multiple times
    Constraint.category_at_most("capital_ending_letter", 1),
    Constraint.category_at_most("capital_starting_letter", 1),
    Constraint.category_at_most("ending_letter", 1)
]
category_probs = {
    'continent': 4,
    'starting_letter': 3,
    'ending_letter': 1.5,
    'capital_starting_letter': 2,
    'capital_ending_letter': .5,
    'flag_colors': 3,
    'landlocked': 4,
    'island': 4
}

generator = preprocessing.get_generator(constraints, category_probs, field_size=3,
                                        seed=None, selection_mode="shuffle_setkeys", uniform=False, shuffle=True)
games = list(generator.sample_games(n=5000))

# Difficulty computation
difficulty_info = compute_game_difficulties(games)

print(difficulty_info)

# preprocessing.save_games(games)