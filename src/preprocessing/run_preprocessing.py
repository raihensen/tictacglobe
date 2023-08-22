
# import preprocessing
# import json
# import pandas as pd

# # Ensure we're running in the right directory
# import os
# script_dir = os.path.dirname(os.path.abspath(__file__))
# os.chdir(script_dir)

# def export_country_data():
#     # Export country data
#     countries = preprocessing.df.to_dict(orient="records")

#     path = "../../data/countries.json"
#     json.dump(countries, open(path, mode="w"))
#     print(f"Exported country data to {path}")

# df = preprocessing.df

# print(df)



import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

import preprocessing
from game import Constraint


df = preprocessing.df
categories = preprocessing.categories

constraints = [
    # We always want a continent
    Constraint.category_at_least("continent", 1),
    
    # Some categories are pretty boring to appear multiple times
    Constraint.category_at_most("capital_ending_letter", 1),
    Constraint.category_at_most("capital_starting_letter", 1),
    Constraint.category_at_most("ending_letter", 1)
]

generator = preprocessing.get_generator(constraints, field_size=3,
                                        seed=None, selection_mode="shuffle_setkeys", uniform=False, shuffle=False)
games = [generator.sample_game() for _ in range(250)]

# Count category occurences
print(pd.Series(sum([[cat.key for cat, value in g.rows + g.cols] for g in games], [])).value_counts())

for game in games[:20]:
    print(game.to_dataframe(solution=True))
