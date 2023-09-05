
from functools import total_ordering
from typing import Callable
import pandas as pd

@total_ordering
class Category:
    def __init__(self, key: str, name: str, difficulty: float, values: pd.Series, alt_values: pd.Series):  # alt_values might be None
        self.key = key
        self.alt_key = key + "_alt"
        self.name = name
        self.difficulty = difficulty
        self.values = values
        if alt_values is None:
            alt_values = self.values.apply(lambda x: [])
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


@total_ordering
class BooleanCategory(Category):
    def __init__(self, df: pd.DataFrame, key: str, name: str, difficulty: float, col: str):
        values = df[col]
        altcol = col + "_alt"
        alt_values = None
        if altcol in list(df.columns):
            alt_values = df.apply(lambda row: [not row[col]] if (not row[col]) in row[altcol] else [], axis=1)
        super().__init__(key, name, difficulty, values, alt_values)
        
    def __str__(self):
        return f"BooleanCategory('{self.key}', {len(self.sets[True])}x True)"
    
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


