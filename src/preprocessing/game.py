
import random
from collections import Counter
from category import *
import pandas as pd
import numpy as np

generator = np.random.default_rng(seed=None)


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
    
    def to_json(self, include_values=False):
        data = {
            "size": self.size,
            "solutions": [[list(cell) for cell in row] for row in self.solutions],
            "alternativeSolutions": [[list(cell) for cell in row] for row in self.alt_solutions],
            "labels": {
                "rows": [get_label(cat, value) for cat, value in self.rows],
                "cols": [get_label(cat, value) for cat, value in self.cols]
            }
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


def get_solutions(cells, row, col, alt=False):
    i = 1 if alt else 0
    if (row, col) in cells:
        return cells[(row, col)][i]
    if (col, row) in cells:
        return cells[(col, row)][i]
    return None


class Constraint:
    def __init__(self, prop, num, mode):
        # prop: function mapping a set (cat key, value) to some boolean value
        # num: number of categories
        # mode: -1: at most *num* matching categories. 0: exactly *num* matching categories. 1: at least *num* categories
        self.prop = prop
        self.num = num
        self.mode = mode
        
    def match(self, key, value):
        return self.prop(key, value)
        
    def count(self, sets):
        return len([(key, value) for key, value in sets if self.match(key, value)])
        
    def balance(self, sets):
        # ("needs x more", "only x more allowed")
        n = self.count(sets)
        return (self.num - n if self.mode >= 0 else None,
                self.num - n if self.mode <= 0 else None)
        
    def apply(self, sets):
        n = self.count(sets)
        if self.mode == -1:
            return n <= self.num
        if self.mode == 0:
            return n == self.num
        return n >= self.num
    
    def is_once(self):
        return self.num == 1 and self.mode == 0
    
    def is_never(self):
        return self.num == 0 and self.mode == 0
    
    @staticmethod
    def category(key, n, mode):
        return Constraint(lambda k, _: k == key, n, mode)
    
    @staticmethod
    def exactly(prop, n):
        return Constraint(prop, n, 0)
    
    @staticmethod
    def at_most(prop, n):
        return Constraint(prop, n, -1)
    
    @staticmethod
    def at_least(prop, n):
        return Constraint(prop, n, 1)
    
    @staticmethod
    def category_exactly(key, n):
        return Constraint.category(key, n, 0)
    
    @staticmethod
    def category_at_most(key, n):
        return Constraint.category(key, n, -1)
    
    @staticmethod
    def category_at_least(key, n):
        return Constraint.category(key, n, 1)
    
    @staticmethod
    def once(prop):
        return Constraint.exactly(prop, 1)
    
    @staticmethod
    def never(prop, n):
        return Constraint.exactly(prop, 0)
    
    @staticmethod
    def at_most_once(prop):
        return Constraint.at_most(prop, 1)
    
    @staticmethod
    def dummy():
        return Constraint(lambda cat: True, 0, 1)


def _get_allowed_sets(cross_sets, parallel_sets, categories, setkeys, constraints):
    # Check constraint balances
    balance = [c.balance(cross_sets + parallel_sets) for c in constraints]
    underfed = [c for (a, b), c in zip(balance, constraints) if a is not None and a > 0]
    overfed = [c for (a, b), c in zip(balance, constraints) if b == 0]
#     print(f"{len(cross_sets)} cross, {len(parallel_sets)} parallel, {len(underfed)} underfed, {len(overfed)} overfed")
    
    # underfed: needs more. overfed: maximum is reached.
    choice = setkeys
    if underfed or overfed:
        # Only take those sets that satisfy some underfed constraint
        choice = [(key, value) for key, value in choice
                  if (any(c.match(key, value) for c in underfed) or not underfed)
                  and not any(c.match(key, value) for c in overfed)]
    # Not 2 identical (cat, value) sets in the game
    choice = set(choice).difference(cross_sets).difference(parallel_sets)
    # Not 2 crossing identical categories, except MultiNominal, but then only 1 each
    # Each category only allowed twice
    cross_cats = Counter(cat for cat, value in cross_sets)
    parallel_cats = Counter(cat for cat, value in parallel_sets)
    choice = {(cat, value) for cat, value in choice
              if (cat not in cross_cats and parallel_cats.get(cat, 0) <= 1)
              or (isinstance(categories[cat], MultiNominalCategory) and cross_cats[cat] == 1 and cat not in parallel_cats)}
    
    return choice


# TODO Boolean cats do not get sampled!

def _get_set_probabilities(categories, choice):
    CATEGORY_PROBS = {
        'continent': 4,
        'starting_letter': 3,
        'ending_letter': 1.5,
        'capital_starting_letter': 2,
        'capital_ending_letter': .5,
        'flag_colors': 3,
        'landlocked': 1,
        'island': 1
    }
    # Extract category occurences
    cat_keys = list({k for k, v in choice})
    category_sizes = {key: len([v for k, v in choice if k == key]) for key in cat_keys}

    # Uniform distribution per category values
    w = np.array([CATEGORY_PROBS[key] / category_sizes[key] for key, value in choice])
    return w / np.sum(w)


def _sample_fitting_set(cross_sets, parallel_sets, categories, setkeys, cells, constraints):
    """ Samples a new column (assuming cross_sets are the rows and parallel_sets the previous columns. Or the other way round) """
    choice = np.array(list(_get_allowed_sets(cross_sets, parallel_sets, categories, setkeys, constraints)))

    # Shuffle the sets (do complete shuffle because might iterate some of them afterwards)
    choice = generator.choice(choice,
                              size=len(choice),
                              p=_get_set_probabilities(categories, choice),
                              replace=False)
    
    # Iterate all possible sets randomly until a fitting one is hit
    for c in choice.tolist():
        c = tuple(c)
        if all(get_solutions(cells, c, crossing) for crossing in cross_sets):
            return c
    return None


def _sample_game_setup(categories, setkeys, cells, field_size, constraints):
    rows, cols = [], []
    for _ in range(field_size):
        # Sample a new column, then a new row
        new_col = _sample_fitting_set(rows, cols, categories, setkeys, cells, constraints)
        if new_col is not None:
            cols.append(new_col)
        else:
            return None, None
        new_row = _sample_fitting_set(cols, rows, categories, setkeys, cells, constraints)
        if new_row is not None:
            rows.append(new_row)
        else:
            return None, None
    if len(rows) != field_size or len(cols) != field_size:
        return None
    # Check constraints
    if not all(c.apply(rows + cols) for c in constraints):
        return None, None
    return rows, cols


def sample_game(categories, setkeys, cells, field_size, constraints=[], shuffle=True):
    MAX_TRIES = 100
    rows, cols = None, None
    for i in range(MAX_TRIES):
        rows, cols = _sample_game_setup(categories, setkeys, cells, field_size, constraints)
        if rows is not None and cols is not None:
            break
    
    if rows is None or cols is None:
        print(f"Could not create game setup ({MAX_TRIES} tries)")
        return None
        
    if shuffle:
        random.shuffle(rows)
        random.shuffle(cols)
        if random.random() > .5:
            rows, cols = cols, rows
    
    game = Game(solutions=[[get_solutions(cells, row, col) for col in cols] for row in rows],
                alt_solutions=[[get_solutions(cells, row, col, alt=True) for col in cols] for row in rows],
                rows=[(categories[cat], value) for cat, value in rows],
                cols=[(categories[cat], value) for cat, value in cols])
    game.i = i
    return game

# get_allowed_sets([('capital_ending_letter', 'T'), ('flag_colors', 'Red'), ('starting_letter', 'T')], [('capital_starting_letter', 'O')])