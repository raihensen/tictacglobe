
from collections import Counter
from category import *
from utils import *
import pandas as pd


def get_label(cat: Category, value):
    if cat.key == "continent":
        continents = {"AF": "Africa", "EU": "Europe", "AS": "Asia", "NA": "N. America", "SA": "S. America", "OC": "Oceania"}
        return continents[value]
    if isinstance(cat, BooleanCategory):
        return cat.name
    return f"{cat.name}: {value}"

class Game:
    values = None

    def __init__(self, solutions, alt_solutions, rows, cols):
        self.size = len(solutions)
        self.values = Game.values  # All possible values to be guessed (list of dicts)
        self.solutions = solutions  # 3x3 array containing list of possible solutions
        self.alt_solutions = alt_solutions  # 3x3 array containing list of possible alternative solutions
        self.rows = rows  # rows (tuples of form (Category, value))
        self.cols = cols  # columns (as above)
        self.data = {}  # dict with additional data (difficulty etc.)
    
    def to_json(self, include_values=False):
        data = {
            "size": self.size,
            "solutions": [[list(cell) for cell in row] for row in self.solutions],
            "alternativeSolutions": [[list(cell) for cell in row] for row in self.alt_solutions],
            "rows": [{"category": cat.key, "value": value} for cat, value in self.rows],
            "cols": [{"category": cat.key, "value": value} for cat, value in self.cols],
            "data": {camel_case(key): value for key, value in self.data.items()}
        }
        if include_values:
            data["values"] = self.values
        return data
    
    def to_dataframe(self, solution=False):
        game_df = pd.DataFrame(data=[[",".join(c1) + (",(" + ",".join(c2) + ")" if c2 else "") for c1, c2 in zip(row1, row2)] for row1, row2 in zip(self.solutions, self.alt_solutions)] if solution else None,
                               index=[get_label(cat, value) for cat, value in self.rows],
                               columns=[get_label(cat, value) for cat, value in self.cols])
        game_df.fillna("", inplace=True)
        return game_df

