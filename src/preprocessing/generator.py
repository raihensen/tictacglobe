
import random
from collections import Counter
import tqdm
import pandas as pd
import numpy as np
import itertools
from category import *
from game import *


class Constraint:
    def __init__(self, prop, num, mode):
        # prop: CategoryConstraint: function mapping a set (cat key, value) to some boolean value
        # ...   CellConstraint: function mapping a cell ((key, value), (key, value), solutions) to some boolean value
        # num: number of categories
        # mode: -1: at most *num* matching categories. 0: exactly *num* matching categories. 1: at least *num* categories
        self.prop = prop
        self.num = num
        self.mode = mode
        
    def count(self, haystack):
        return len([item for item in haystack if self.match(*item)])
        
    def balance(self, haystack):
        # ("needs x more", "only x more allowed")
        n = self.count(haystack)
        return (self.num - n if self.mode >= 0 else None,
                self.num - n if self.mode <= 0 else None)
        
    def apply(self, haystack):
        n = self.count(haystack)
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
        return CategoryConstraint(lambda k, _: k == key, n, mode)
    
    @staticmethod
    def solutions_at_most(country_codes, n):
        """ This constrained is added for each country. Constraints are not applied to cells, but to  """
        for c in country_codes:
            prop = lambda row, col, solutions, c=c: c in solutions
            yield CellConstraint.at_most(prop, n)
    
    @staticmethod
    def category_exactly(key, n):
        return Constraint.category(key, n, 0)
    
    @staticmethod
    def category_at_most(key, n):
        return Constraint.category(key, n, -1)
    
    @staticmethod
    def category_at_least(key, n):
        return Constraint.category(key, n, 1)

class CategoryConstraint(Constraint):
        
    def match(self, key, value):
        return self.prop(key, value)
    
    @staticmethod
    def exactly(prop, n):
        return CategoryConstraint(prop, n, 0)
    
    @staticmethod
    def at_most(prop, n):
        return CategoryConstraint(prop, n, -1)
    
    @staticmethod
    def at_least(prop, n):
        return CategoryConstraint(prop, n, 1)
    
    @staticmethod
    def once(prop):
        return CategoryConstraint.exactly(prop, 1)
    
    @staticmethod
    def never(prop, n):
        return CategoryConstraint.exactly(prop, 0)
    
    @staticmethod
    def at_most_once(prop):
        return CategoryConstraint.at_most(prop, 1)
    
    @staticmethod
    def dummy():
        return CategoryConstraint(lambda cat: True, 0, 1)
    
class CellConstraint(Constraint):
        
    def match(self, row, col, solutions):
        return self.prop(row, col, solutions)
    
    @staticmethod
    def exactly(prop, n):
        return CellConstraint(prop, n, 0)
    
    @staticmethod
    def at_most(prop, n):
        return CellConstraint(prop, n, -1)
    
    @staticmethod
    def at_least(prop, n):
        return CellConstraint(prop, n, 1)
    
    

class GameGenerator:
    def __init__(self, preprocessor, category_probs, constraints=[], seed=None, selection_mode="shuffle_categories", precompute_probs=True, uniform=False, shuffle=True):
        self.categories = preprocessor.categories
        self.setkeys = preprocessor.setkeys
        self.cells = preprocessor.cells
        # self.category_probs = category_probs if category_probs is not None else DEFAULT_CATEGORY_PROBS
        self.category_probs = category_probs
        self.field_size = preprocessor.field_size
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

                # ValueError: Fewer non-zero entries in p than size
                # nonzero = (prob > 0).sum()
                # if nonzero < len(sample):
                #     print(f"Too few values to sample ({nonzero} < {len(sample)})")
                #     print(sample.sort_values("prob0"))
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

    def _cell_constraint_info(self, rows, cols):
        # Prepares the arguments to apply a cell constraint.
        return [(row, col, self._get_solutions(row, col, alt=False)) for row, col in itertools.product(rows, cols)]

    def _get_allowed_sets(self, cross_sets, parallel_sets):
        choice = self.setkeys
        # Not 2 identical (cat, value) sets in the game
        choice = set(choice).difference(cross_sets).difference(parallel_sets)
        # Not 2 crossing identical categories, except MultiNominal, but then only 1 each
        # Each category only allowed twice
        cross_cats = Counter(cat for cat, value in cross_sets)
        parallel_cats = Counter(cat for cat, value in parallel_sets)
        choice = {(cat, value) for cat, value in choice
                if (cat not in cross_cats and parallel_cats.get(cat, 0) <= 1)
                or (isinstance(self.categories[cat], MultiNominalCategory) and cross_cats[cat] == 1 and cat not in parallel_cats)}
        
        # Generate a preview of the newly added cells with their solutions
        new_cells_choice = {(key, value): self._cell_constraint_info(cross_sets, [(key, value)]) for key, value in choice}
        # Filter out where no solutions exist
        choice = [(cat, value) for cat, value in choice if all([solutions is not None and len(solutions) > 0 for _,_,solutions in new_cells_choice[(cat, value)]])]


        # Check constraint balances
        # print("_cell_constraint_info:", self._cell_constraint_info(cross_sets, parallel_sets))
        category_constraints = [c for c in self.constraints if isinstance(c, CategoryConstraint)]
        cell_constraints = [c for c in self.constraints if isinstance(c, CellConstraint)]
        balance_category = [c.balance(cross_sets + parallel_sets) for c in self.constraints if isinstance(c, CategoryConstraint)]
        balance_cell = [c.balance(self._cell_constraint_info(cross_sets, parallel_sets)) for c in self.constraints if isinstance(c, CellConstraint)]
        underfed_category = [c for (a, b), c in zip(balance_category, category_constraints) if a is not None and a > 0]
        overfed_category = [c for (a, b), c in zip(balance_category, category_constraints) if b == 0]
        underfed_cell = [c for (a, b), c in zip(balance_cell, cell_constraints) if a is not None and a > 0]
        overfed_cell = [c for (a, b), c in zip(balance_cell, cell_constraints) if b == 0]

        # underfed: needs more. overfed: maximum is reached.
        # Strictly prohibited to satisfy an already overfed constraint
        choice = [(key, value) for key, value in choice
                if not any(o.match(key, value) for o in overfed_category)
                and not any(any(o.match(row, col, solutions) for row, col, solutions in new_cells_choice[(key, value)]) for o in overfed_cell)]
        
        choice_ignore_underfed = choice
        # Only take those sets that satisfy some underfed constraint
        choice_satisfy_underfed = [(key, value) for key, value in choice
                                   if (any(u.match(key, value) for u in underfed_category) or not underfed_category)
                                   and (any(any(u.match(row, col, solutions) for row, col, solutions in new_cells_choice[(key, value)]) for u in underfed_cell) or not underfed_cell)]
        
        if len(choice_satisfy_underfed) > 0:
            choice = choice_satisfy_underfed
        else:
            choice = choice_ignore_underfed
        
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
        if len(choice) == 0:
            return None

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
        for i in range(self.field_size):
            # Sample a new column, then a new row
            new_col = self._sample_fitting_set(rows, cols)
            if new_col is not None:
                cols.append(new_col)
            else:
                # print("Cancel")
                return None, None
            
            # if i > 0:
            #     print(len(rows) + len(cols), rows, cols)

            new_row = self._sample_fitting_set(cols, rows)
            if new_row is not None:
                rows.append(new_row)
            else:
                # print("Cancel")
                return None, None
            # print(len(rows) + len(cols), rows, cols)
        
        # Check constraints
        if not all(c.apply(rows + cols) for c in self.constraints if isinstance(c, CategoryConstraint)):
            return None, None
        if not all(c.apply(self._cell_constraint_info(rows, cols)) for c in self.constraints if isinstance(c, CellConstraint)):
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
            print(f"Error: Could not create game setup ({MAX_TRIES} tries)")
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
        game.sample_tries = i
        return game
    
    def sample_games(self, n=100, progress_bar=True):
        print(f"Generate {n} games...")
        iter = tqdm.tqdm(range(n)) if progress_bar else range(n)
        for _ in iter:
            game = self.sample_game()
            if game is None:
                return []
            yield game
    
    # Alias for sample_game()
    def generate_game(self):
        return self.sample_game()
    
    # Alias for sample_games()
    def generate_games(self, n=100, progress_bar=True):
        return self.sample_games(n=n, progress_bar=progress_bar)

