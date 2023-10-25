

import json
import pandas as pd
import numpy as np
import itertools
import datetime
from game import *
from generator import *
from category import *
from utils import *
from typing import Optional

# Ensure we're running in the right directory
chdir_this_file()


class Preprocessor:
    def __init__(self,
                 countries: pd.DataFrame,
                 language: str = "EN",
                 field_size: int = 3,
                 min_cell_size: int = 1,
                 max_cell_size: Optional[int] = None):

        self.df = countries
        self.language = language
        self.field_size = field_size
        self.min_cell_size = max(1, min_cell_size)
        self.max_cell_size = max_cell_size
        
        # ------------------------------------------------------------------------------------------------------------------
        # Fix data format
        self.df["continent"].fillna("NA", inplace=True)  # North America fix
        self.df["iso"].fillna("NA", inplace=True)  # Namibia fix
        # altcols = [col for col in self.df.columns if col.endswith("_alt")]
        # listcols = altcols + ["neighbors", "terrritories", "languages", "flag_colors"]
        # list_cols = [col for col in self.df.columns if self.df[col].apply(lambda s: isinstance(s, str) and s.startswith("[") and s.endswith("]")).all()]
        # for col in list_cols:
        #     self.df[col] = self.df[col].apply(lambda s: [x.strip() for x in s[1:-1].split(",") if len(x.strip()) > 0])

        # ------------------------------------------------------------------------------------------------------------------
        # Categories

        self.categories = [
            NominalCategory(self.df, key="continent", name="Continent", difficulty=1, col="continent"),
            NominalCategory(self.df, key="starting_letter", name="Starting letter", difficulty=1, col="name", extractor=lambda x: x[0].upper()),
            NominalCategory(self.df, key="ending_letter", name="Ending letter", difficulty=2, col="name", extractor=lambda x: x[-1].upper()),
            NominalCategory(self.df, key="capital_starting_letter", name="Capital starting letter", difficulty=1.5, col="capital", extractor=lambda x: x[0].upper()),
            NominalCategory(self.df, key="capital_ending_letter", name="Capital ending letter", difficulty=3, col="capital", extractor=lambda x: x[-1].upper()),
            MultiNominalCategory(self.df, key="flag_colors", name="Flag color", difficulty=1.5, col="flag_colors"),
            SimpleBooleanCategory(self.df, key="landlocked", name="Landlocked", difficulty=2, col="landlocked"),
            SimpleBooleanCategory(self.df, key="island", name="Island Nation", difficulty=1.5, col="island"),
            # New as of 20231025
            TopNCategory(self.df, key="top_20_population", name="Top 20 Population", difficulty=1, col="population", n=20),
            BottomNCategory(self.df, key="bottom_20_population", name="Bottom 20 Population", difficulty=2, col="population", n=20),
            TopNCategory(self.df, key="top_20_area", name="Top 20 Area", difficulty=1.5, col="area_km2", n=20),
            BottomNCategory(self.df, key="bottom_20_area", name="Bottom 20 Area", difficulty=2, col="area_km2", n=20),
            GreaterThanCategory(self.df, key="elevation_sup5k", name="Mountain over 5000m", difficulty=2, col="max_elev", bound=5000, or_equal=True),
            LessThanCategory(self.df, key="elevation_sub1k", name="No mountains over 1000m", difficulty=2.5, col="max_elev", bound=1000, or_equal=False)
        ]
        self.categories = {cat.key: cat for cat in self.categories}

        self.values = pd.concat([
            self.df[["iso", "name"]],
            pd.DataFrame({cat.key: cat.values for cat in self.categories.values()}),
            pd.DataFrame({cat.alt_key: cat.alt_values for cat in self.categories.values() if cat.alt_values is not None}),
        ], axis=1)

        # ------------------------------------------------------------------------------------------------------------------
        # Generate category value lists

        for cat in self.categories.values():
            if isinstance(cat, NominalCategory):
                cat.sets = self.values.groupby(by=cat.key)["iso"].agg(sorted)
                cat.alt_sets = self.values.explode(column=cat.alt_key).groupby(by=cat.alt_key)["iso"].agg(sorted)
            elif isinstance(cat, MultiNominalCategory):
                cat.sets = self.values.explode(column=cat.key).groupby(by=cat.key)["iso"].agg(sorted)
                cat.alt_sets = self.values.explode(column=cat.alt_key).groupby(by=cat.alt_key)["iso"].agg(sorted)
            elif isinstance(cat, BooleanCategory):
                # only consider True values. The False group does not yield a catset
                cat.sets = self.values.groupby(by=cat.key)["iso"].agg(sorted)
                cat.sets = cat.sets[cat.sets.index]
                cat.alt_sets = self.values.explode(column=cat.alt_key).groupby(by=cat.alt_key)["iso"].agg(sorted)
                cat.alt_sets = cat.alt_sets[cat.alt_sets.index]

        # Filter out infrequent values (Retain only sets with at least 3 (FIELD_SIZE) elements)
        while True:
            num_sets_0 = sum(len(cat.sets) for cat in self.categories.values())
            for cat in self.categories.values():
                cat.sets = cat.sets[cat.sets.apply(len) >= self.field_size]
            num_sets_1 = sum(len(cat.sets) for cat in self.categories.values())
            if num_sets_0 != num_sets_1:
                print(f"Removed {num_sets_0 - num_sets_1} category sets")
            # Retain only countries contained in sets of at least 2 different categories (need matching row + column)
            category_contents = {cat.key: cat.sets.sum() for cat in self.categories.values()}
            # {cat: len(cc) for cat, cc in category_contents.items()}
            contents = set().union(*[set(cc) for cc in category_contents.values()])
            print("contents:", len(contents))
            retain = {c for c in contents if len([key for key, cc in category_contents.items() if c in cc]) >= 2}
            print("retain:", len(retain))
            remove = contents.difference(retain)
            
            for cat in self.categories.values():
                cat.sets = cat.sets.apply(lambda cc: [c for c in cc if c in retain])
            if not remove:
                print("No countries to remove")
                break
            print(f"Removed {len(remove)} countries:", remove)
            print("Repeat ...")

        # ------------------------------------------------------------------------------------------------------------------
        # Init setkeys & cells

        self.setkeys = sum([[(cat.key, value) for value in cat.sets.index] for cat in self.categories.values()], [])
        self.cells = {}
        for (key1, value1), (key2, value2) in itertools.combinations(self.setkeys, 2):
            if self.is_cell_allowed(key1, value1, key2, value2):
                row, col = (key1, value1), (key2, value2)
                if row < col:  # row has the lexicographically smaller (key, value) pair
                    row, col = col, row
                self.cells[(row, col)] = self.init_cell_contents(*row, *col)

        print(f"Generated {len(self.setkeys)} sets and {len(self.cells)} cells")

        # Bring cells to DataFrame to do filtering (cell size etc.)
        self.cell_info = pd.DataFrame([{"row_cat": row[0], "row_val": row[1],
                                        "col_cat": col[0], "col_val": col[1],
                                        "contents": contents,
                                        "alt_contents": self.init_cell_contents(*row, *col, alt=True)}
                                        for (row, col), contents in self.cells.items()])
        self.cell_info["size"] = self.cell_info["contents"].apply(len)

        # ------------------------------------------------------------------------------------------------------------------
        # Filter cells w.r.t. number of solutions
        
        if self.min_cell_size is not None:
            self.cell_info = self.cell_info[(self.cell_info["size"] >= self.min_cell_size)]
        if self.max_cell_size is not None:
            self.cell_info = self.cell_info[(self.cell_info["size"] <= self.max_cell_size)]
        cell_keys = self.cell_info.apply(lambda row: ((row["row_cat"], row["row_val"]), (row["col_cat"], row["col_val"])), axis=1)
        self.cells = {key: (contents, alt_contents) for key, contents, alt_contents in zip(cell_keys,
                                                                                           self.cell_info["contents"],
                                                                                           self.cell_info["alt_contents"])}
        setkeys_old = self.setkeys
        self.setkeys = list(sorted(set(pd.concat([cell_keys.apply(lambda c: c[0]), cell_keys.apply(lambda c: c[1])]).tolist())))

        print(f"Retained {len(self.cells)} cells (of size {self.min_cell_size}-{self.max_cell_size})")
        if len(self.setkeys) < len(setkeys_old):
            print(f"This lead to the removal of {len(setkeys_old) - len(self.setkeys)} key/value sets.")

        # plt.hist(cell_info["size"], rwidth=.9, bins=[x-.5 for x in range(cell_info["size"].min(), cell_info["size"].max() + 1)])
        # plt.title("Distribution of cell sizes")
        # plt.show()

    def is_cell_allowed(self, key1, value1, key2, value2):
        # TODO incompatible ComparisonCategories? (bottom n, top n of the same col)
        if key1 != key2:
            return True
        if value1 == value2:
            return False
        cat = self.categories[key1]
        return isinstance(cat, MultiNominalCategory)
    
    def init_cell_contents(self, key1, value1, key2, value2, alt=False):
        cat1, cat2 = self.categories[key1], self.categories[key2]
        contents = set(cat1.sets[value1]).intersection(cat2.sets[value2])
        if not alt:
            return sorted(contents)
        
        # Solutions caused by alternative values
        all1 = set(cat1.sets[value1] + cat1.alt_sets.get(value1, []))
        all2 = set(cat2.sets[value2] + cat2.alt_sets.get(value2, []))
        alt_contents = all1.intersection(all2).difference(contents)
        if not alt_contents:
            return []
        
        # Prevent that two different alternative values are used to create a solution
        # (e.g. Capital starting with P and ending with N -> South Africa - because of [P]retoria and Cape Tow[n])
        # Only implemented for NominalCategory, as is it using an extractor function
        if isinstance(cat1, NominalCategory) and isinstance(cat2, NominalCategory):
            if cat1.col == cat2.col and cat1.extractor and cat2.extractor:
                col = cat1.col
                altcol = cat1.alt_col
                dfx = self.df[self.df["iso"].isin(alt_contents)][["iso", col, altcol]].copy()
                dfx["values"] = dfx.apply(lambda row: [row[col]] + list(row[altcol]), axis=1)
                dfx["src1"] = dfx["values"].apply(lambda xx: [x for x in xx if cat1.extractor(x) == value1])
                dfx["src2"] = dfx["values"].apply(lambda xx: [x for x in xx if cat2.extractor(x) == value2])
                dfx["keep"] = dfx.apply(lambda row: not set(row["src1"]).isdisjoint(row["src2"]), axis=1)
                alt_contents = dfx[dfx["keep"]]["iso"].tolist()
                
        # print(f"{key1}/{value1} - {key2}/{value2}")
        # display(dfx)
        # print(f"keep {alt_contents}")
        
        return sorted(set(alt_contents))

    # ------------------------------------------------------------------------------------------------------------------
    # Game creation interface

    """ Instantiates the GameGenerator class, providing it with all data from preprocessing and setting additional parameters. """
    def get_generator(self, constraints, category_probs, seed=None, selection_mode="shuffle_categories", uniform=False, shuffle=True):
        
        return GameGenerator(preprocessor=self,
                             category_probs=category_probs,
                             constraints=constraints,
                             seed=seed,
                             selection_mode=selection_mode,
                             uniform=uniform,
                             shuffle=shuffle)


    def save_games(self, games, name: str):
        games = list(games)
        timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        info = [timestamp, name, self.language.lower()]
        path = f"../../public/data/games/{self.language.lower()}/games-{'-'.join(info)}.json"
        json.dump([game.to_json() for game in games], open(path, mode="w", encoding="utf-8"))
        print(f"{len(games)} games saved to {path}")

