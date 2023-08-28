
import random
from collections import Counter

import tqdm
from category import *
import pandas as pd
import numpy as np


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


class GameGenerator:
    def __init__(self, categories, category_probs, setkeys, cells, field_size, constraints=[], seed=None, selection_mode="shuffle_categories", precompute_probs=True, uniform=False, shuffle=True):
        self.categories = categories
        # self.category_probs = category_probs if category_probs is not None else DEFAULT_CATEGORY_PROBS
        self.category_probs = category_probs
        self.setkeys = setkeys
        self.cells = cells
        self.field_size = field_size
        self.constraints = constraints
        self.selection_mode = selection_mode
        self.uniform = uniform  # Sample all setkeys uniformly. Otherwise, use defined category probabilities and divide uniformly among possible category values.
        self.shuffle = shuffle  # Whether to shuffle the resulting rows and columns
        self.seed = seed
        self.random = np.random.default_rng(seed=seed)
        
        self.df_sample = None
        self.df_cats = None
        self.precomputed_probs = False

        if precompute_probs:
            self._init_sample_df()

    def _init_sample_df(self):

        sample = pd.DataFrame([{"cat": key, "value": value} for key, value in self.setkeys])
        cats = None
        cat_size = sample["cat"].value_counts().rename("cat_size")
        cat_prob = pd.Series(self.category_probs, name="cat_prob")

        if self.selection_mode == "shuffle_setkeys":  # DEPR: this leads to unprobable categories being selected almost *never* because the frequent categories have many values
            if self.uniform:
                sample["prob0"] = 1
            else:
                sample = sample.join(cat_prob, on="cat")
                sample = sample.join(cat_size, on="cat")
                sample["prob0"] = sample["cat_prob"] / sample["cat_size"]
            # sample["prob0"] = sample["prob0"] / sample["prob0"].sum()
            # prob0: initial probability. Need new column "prob" to normalize to sum 1 in each iteration
        
        elif self.selection_mode == "shuffle_categories":  # NEW
            cats = pd.merge(cat_size, cat_prob, left_index=True, right_index=True)
            if self.uniform:
                sample["cat_index"] = np.nan
                # sample = sample.join(cat_size.apply(lambda n: self.random.random()).rename("cat_index"), on="cat")
            else:
                cats["cat_index"] = np.nan
                sample["cat_index"] = np.nan
                # cats = cats.sample(len(cats), replace=False, weights="cat_prob", random_state=random_state)
                # cats["cat_index"] = range(len(cats))
                # sample = sample.join(cats["cat_index"], on="cat")
            
            sample["rnd"] = np.nan
            # sample["rnd"] = self.random.random(size=len(sample))
            # sample.sort_values(["cat_index", "rnd"], inplace=True)
        
        self.df_sample = sample
        self.df_cats = cats
        self.precomputed_probs = True

    def _shuffle_setkeys(self, choice):
        
        random_state = self.seed  # when pandas updates, change to self.random (np.random.Generator instance)
        
        if self.precomputed_probs:

            sample = self.df_sample
            cats = self.df_cats

            # Prepare filter (values available in choice)
            ix = sample.apply(lambda row: (row["cat"], row["value"]) in choice, axis=1)

            if self.selection_mode == "shuffle_setkeys":  # DEPR: this leads to unprobable categories being selected almost *never* because the frequent categories have many values
                sample = sample[ix]
                prob = sample["prob0"] / sample["prob0"].sum()
                # shuffle category-value pairs with weights
                sample = sample.sample(len(sample), replace=False, weights=prob, random_state=random_state)
            
            elif self.selection_mode == "shuffle_categories":  # NEW
                if self.uniform:
                    # "shuffle" categories uniformly
                    cats["cat_index"] = self.random.random(size=len(cats))
                else:
                    # shuffle categories with weights
                    cats = cats.sample(len(cats), replace=False, weights="cat_prob", random_state=random_state)
                    cats["cat_index"] = range(len(cats))
                
                sample["cat_index"] = sample["cat"].map(cats["cat_index"])
                sample["rnd"] = self.random.random(size=len(sample))
                sample = sample[ix]  # only now filter, cannot change values inside slice
                sample = sample.sort_values(["cat_index", "rnd"])
            
            # print("---------------")
            # print(sample)
            return sample.apply(lambda row: (row["cat"], row["value"]), axis=1).tolist()

        if not self.precomputed_probs:

            sample = pd.DataFrame([{"cat": key, "value": value} for key, value in choice])

            cat_size = sample["cat"].value_counts().rename("cat_size")
            cat_prob = pd.Series(self.category_probs, name="cat_prob")

            if self.selection_mode == "shuffle_setkeys":  # DEPR: this leads to unprobable categories being selected almost *never* because the frequent categories have many values
                if self.uniform:
                    sample["prob"] = 1
                else:
                    sample = sample.join(cat_prob, on="cat")
                    sample = sample.join(cat_size, on="cat")
                    sample["prob"] = sample["cat_prob"] / sample["cat_size"]
                
                # Idea: Might still use this, but pre-compute probabilities and just filter (reducing the cumulative category probabilities when certain values are not possible)
                sample["prob"] = sample["prob"] / sample["prob"].sum()
                sample = sample.sample(len(sample), replace=False, weights="prob", random_state=random_state)
            
            elif self.selection_mode == "shuffle_categories":  # NEW
                
                if self.uniform:
                    sample = sample.join(cat_size.apply(lambda n: self.random.random()).rename("cat_index"), on="cat")
                else:
                    cats = pd.merge(cat_size, cat_prob, left_index=True, right_index=True)
                    cats = cats.sample(len(cats), replace=False, weights="cat_prob", random_state=random_state)
                    cats["cat_index"] = range(len(cats))
                    sample = sample.join(cats["cat_index"], on="cat")
                
                sample["rnd"] = self.random.random(size=len(sample))
                sample.sort_values(["cat_index", "rnd"], inplace=True)
            
            # print(sample)
            return sample.apply(lambda row: (row["cat"], row["value"]), axis=1).tolist()

    def _get_allowed_sets(self, cross_sets, parallel_sets):
        # Check constraint balances
        balance = [c.balance(cross_sets + parallel_sets) for c in self.constraints]
        underfed = [c for (a, b), c in zip(balance, self.constraints) if a is not None and a > 0]
        overfed = [c for (a, b), c in zip(balance, self.constraints) if b == 0]
    #     print(f"{len(cross_sets)} cross, {len(parallel_sets)} parallel, {len(underfed)} underfed, {len(overfed)} overfed")
        
        # underfed: needs more. overfed: maximum is reached.
        choice = self.setkeys
        if underfed or overfed:
            # Only take those sets that satisfy some underfed constraint
            # TODO this might lead to a "deadlock" when an underfed constrained can only be satisfied by a row, but a column is tried to be sampled
            # idea: If no underfed constraint can be satisfied, relax and just not satisfy an already overfed constraint (stricly forbidden!)
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
                or (isinstance(self.categories[cat], MultiNominalCategory) and cross_cats[cat] == 1 and cat not in parallel_cats)}
    
        return choice

    def _get_solutions(self, row, col, alt=False):
        i = 1 if alt else 0
        if (row, col) in self.cells:
            return self.cells[(row, col)][i]
        if (col, row) in self.cells:
            return self.cells[(col, row)][i]
        return None

    def _sample_fitting_set(self, cross_sets, parallel_sets):
        """ Samples a new column (assuming cross_sets are the rows and parallel_sets the previous columns. Or the other way round) """
        choice = list(self._get_allowed_sets(cross_sets, parallel_sets))

        # if len(cross_sets) + len(parallel_sets) == 1:
        #     print("--- Initial choice -------------------------------------")
            # print("\n".join([str(catset) for catset in choice]))

        # Shuffle the sets (do complete shuffle because might iterate some of them afterwards)
        choice = self._shuffle_setkeys(choice)
        
        # Iterate all possible sets randomly until a fitting one is hit
        for set1 in choice:
            set1 = tuple(set1)
            if all(self._get_solutions(set1, set2) for set2 in cross_sets):
                return set1
        return None

    def _sample_game_setup(self):
        rows, cols = [], []
        # print("--------------------------------------------------------------------------")
        for _ in range(self.field_size):
            # Sample a new column, then a new row
            new_col = self._sample_fitting_set(rows, cols)
            if new_col is not None:
                cols.append(new_col)
            else:
                return None, None
            new_row = self._sample_fitting_set(cols, rows)
            if new_row is not None:
                rows.append(new_row)
            else:
                return None, None
        if len(rows) != self.field_size or len(cols) != self.field_size:
            return None
        # Check constraints
        if not all(c.apply(rows + cols) for c in self.constraints):
            return None, None
        return rows, cols


    def sample_game(self):
        MAX_TRIES = 100
        rows, cols = None, None
        for i in range(MAX_TRIES):
            rows, cols = self._sample_game_setup()
            if rows is not None and cols is not None:
                break
        
        if rows is None or cols is None:
            print(f"Could not create game setup ({MAX_TRIES} tries)")
            return None
            
        if self.shuffle:
            random.shuffle(rows)
            random.shuffle(cols)
            if random.random() > .5:
                rows, cols = cols, rows
        
        game = Game(solutions=[[self._get_solutions(row, col, alt=False) for col in cols] for row in rows],
                    alt_solutions=[[self._get_solutions(row, col, alt=True) for col in cols] for row in rows],
                    rows=[(self.categories[cat], value) for cat, value in rows],
                    cols=[(self.categories[cat], value) for cat, value in cols])
        
        return game
    
    def sample_games(self, n=100, progress_bar=True):
        iter = tqdm.tqdm(range(n)) if progress_bar else range(n)
        for _ in iter:
            game = self.sample_game()
            if game is None:
                return
            yield game
    
    # Alias for sample_game()
    def generate_game(self):
        return self.sample_game()
    
    # Alias for sample_games()
    def generate_games(self, n=100, progress_bar=True):
        return self.sample_games(n=n, progress_bar=progress_bar)

