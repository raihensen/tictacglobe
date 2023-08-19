
from functools import total_ordering
from typing import Callable
import pandas as pd

@total_ordering
class Category:
    def __init__(self, key: str, name: str, difficulty: float, values: pd.Series, alt_values: pd.Series):
        self.key = key
        self.alt_key = key + "_alt"
        self.name = name
        self.difficulty = difficulty
        self.values = values
        self.alt_values = alt_values
        self.sets = None
        self.alt_sets = None
        
    def __repr__(self):
        return str(self)
    
    def __lt__(self, other):
        return self.key < other.key
    
    def __eq__(self, other):
        return self.key == other.key
    
    def __hash__(self):
        return hash(self.key)

@total_ordering
class NominalCategory(Category):
    def __init__(self, df: pd.DataFrame, key: str, name: str, difficulty: float, col: str, extractor: Callable = None):
        self.col = col
        self.extractor = extractor
        if extractor is None:
            extractor = lambda x: x
        values = df[col].apply(extractor)
        altcol = col + "_alt"
        self.alt_col = altcol
        alt_values = None
        if self.alt_col in list(df.columns):
            data = pd.concat([df, values], axis=1)
            alt_values = data.apply(lambda row: list(sorted({extractor(x) for x in row[altcol]}.difference(row[col]))), axis=1)
#                 print(alt_values[alt_values.apply(len) > 0])
        super().__init__(key, name, difficulty, values, alt_values)
        
    def __str__(self):
        return f"NominalCategory('{self.key}', {len(self.sets)} values)"
    
    def __lt__(self, other):
        return self.key < other.key
    
    def __eq__(self, other):
        return self.key == other.key
    
    def __hash__(self):
        return hash(self.key)


@total_ordering
class MultiNominalCategory(Category):
    def __init__(self, df: pd.DataFrame, key: str, name: str, difficulty: float, col: str):
        values = df[col].apply(set).apply(sorted).apply(list)
        altcol = col + "_alt"
        alt_values = None
        if altcol in list(df.columns):
            alt_values = df.apply(lambda row: list(sorted(set(row[altcol]).difference(row[col]))), axis=1)
        super().__init__(key, name, difficulty, values, alt_values)
        
    def __str__(self):
        return f"MultiNominalCategory('{self.key}', {len(self.sets)} values)"
    
    def __lt__(self, other):
        return self.key < other.key
    
    def __eq__(self, other):
        return self.key == other.key
    
    def __hash__(self):
        return hash(self.key)


def compare_sets(set1, set2):
    if len(set1) < len(set2):
        return -1
    if len(set1) > len(set2):
        return 1
    l1 = list(sorted(set(set1)))
    l2 = list(sorted(set(set2)))
    if l1 < l2:
        return -1
    if l1 > l2:
        return 1
    return 0


def min_set(set1, set2):
    cmp = compare_sets(set1, set2)
    return set2 if cmp > 0 else set1


def max_set(set1, set2):
    cmp = compare_sets(set1, set2)
    return set2 if cmp < 0 else set1


def is_cell_allowed(key1, value1, key2, value2, categories):
    if key1 != key2:
        return True
    cat = categories[key1]
    if value1 == value2:
        return False
    return isinstance(cat, MultiNominalCategory)


def init_cell_contents(key1, value1, key2, value2, df, categories, alt=False):
    cat1, cat2 = categories[key1], categories[key2]
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
    if isinstance(cat1, NominalCategory) and isinstance(cat2, NominalCategory):
        if cat1.col == cat2.col and cat1.extractor and cat2.extractor:
            col = cat1.col
            altcol = cat1.alt_col
            dfx = df[df["iso"].isin(alt_contents)][["iso", col, altcol]].copy()
            dfx["values"] = dfx.apply(lambda row: [row[col]] + list(row[altcol]), axis=1)
            dfx["src1"] = dfx["values"].apply(lambda xx: [x for x in xx if cat1.extractor(x) == value1])
            dfx["src2"] = dfx["values"].apply(lambda xx: [x for x in xx if cat2.extractor(x) == value2])
            dfx["keep"] = dfx.apply(lambda row: not set(row["src1"]).isdisjoint(row["src2"]), axis=1)
            alt_contents = dfx[dfx["keep"]]["iso"].tolist()
            
#             print(f"{key1}/{value1} - {key2}/{value2}")
#             display(dfx)
#             print(f"keep {alt_contents}")
    
    return sorted(set(alt_contents))


