
import pandas as pd
import numpy as np
import itertools
import preprocessing
from enum import Enum


COUNTRY_DIFFICULTY_WEIGHTS = {
    "sqrt_name_length": 0.25,
    "log_population": -1,
    "log_gdp": -2,
    "log_gdp_per_capita": -0.5
}
SOLUTION_DIFFICULTY_WEIGHTS = {
    "median": 3,
    "std": 0.5,
    "size_score": 2,
    "offset": 1.5  # here: category difficulty
}
CELL_DIFFICULTY_WEIGHTS = {
    "row_col_difficulty": 2,
    "content_difficulty": 3
}
GAME_DIFFICULTY_WEIGHTS = {
    "avg_cell_difficulty": 1,
    "num_unique": 0.33
}


class DifficultyLevel(Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    
    def __str__(self):
        return self.value
    
    def __repr__(self):
        return str(self)
    
    def __float__(self):
        return float(["easy", "medium", "hard"].index(self.value))


def normalize_zero_centered(x: pd.Series, scale=1):  # map to interval [-scale, +scale]
    return scale * (2 * (x - x.min()) / (x.max() - x.min()) - 1)

def normalize(x: pd.Series, scale=1):  # map to interval [0, scale]
    return scale * (x - x.min()) / (x.max() - x.min())

def linear_combination(df, weights):
    return sum(w * df[col] for col, w in weights.items())

def normalized_combination(df, weights, scale=1):
    return normalize(linear_combination(df, weights), scale=scale)


def compute_solution_difficulties(difficulties: pd.Series, offsets=None):
    if offsets is None:
        offsets = np.zeros_like(difficulties)
    info = difficulties.copy().rename("difficulties").reset_index()
    info["offset"] = offsets
    info["size"] = info.difficulties.apply(len)
    info["size_score"] = normalize(-np.sqrt(info["size"]), scale=10)
    info["mean"] = info.difficulties.apply(np.mean)
    info["min"] = info.difficulties.apply(min)
    info["max"] = info.difficulties.apply(max)
    info["median"] = info.difficulties.apply(np.median)
    info["std"] = info.difficulties.apply(np.std)
    info.drop(columns=["difficulties"], inplace=True)
    return normalized_combination(info, SOLUTION_DIFFICULTY_WEIGHTS, scale=10).astype("float64")


def compute_country_difficulties(df):
    print(f"Compute difficulty of {len(df)} countries...")
    df["difficulty"] = normalized_combination(pd.DataFrame({
        "sqrt_name_length": normalize(np.sqrt(df["name"].apply(len)), scale=10),
        "log_population": normalize(np.log(df["population"]), scale=10),
        "log_gdp": normalize(np.log(df["gdp"]), scale=10),
        "log_gdp_per_capita": normalize(np.log(df["gdp_per_capita"]), scale=10)
    }), COUNTRY_DIFFICULTY_WEIGHTS, scale=10)

    # VATICAN is an outlier. As reference, set as difficult as MONACO.
    df.loc[df["name"] == "Vatican", "difficulty"] = df.loc[df["name"] == "Monaco", "difficulty"].iloc[0]


def compute_category_difficulties(df):
    # Compute category-value difficulties
    print(f"Compute difficulty of {len(preprocessing.setkeys)} category-value pairs...")
    categories = preprocessing.categories
    setkeys = preprocessing.setkeys
    for key, value in setkeys:
        cat = categories[key]
        df[(key, value)] = df.iso.apply(lambda iso: iso in cat.sets.loc[value])

    category_info = pd.Series({(key, value): df[df[(key, value)]].difficulty.agg(list) for key, value in setkeys})
    category_info = category_info.reset_index()
    category_info.columns=["key", "value", "difficulties"]
    cat_difficulty = normalize(category_info.key.apply(lambda key: categories[key].difficulty), scale=10)
    category_info["difficulty"] = compute_solution_difficulties(category_info["difficulties"], offsets=cat_difficulty)
    category_info["countries"] = category_info.apply(lambda row: categories[row["key"]].sets.loc[row["value"]], axis=1)
    category_info.set_index(["key", "value"], inplace=True)
    return category_info


def compute_cell_difficulties(df, category_info):
    # Compute cell difficulties
    cell_info = preprocessing.cell_info.copy().reset_index(drop=True)
    print(f"Compute difficulty of {len(cell_info)} cells...")
    cell_info = cell_info.join(category_info["difficulty"].rename("row_difficulty"), on=["row_cat", "row_val"])
    cell_info = cell_info.join(category_info["difficulty"].rename("col_difficulty"), on=["col_cat", "col_val"])
    cell_info["row_col_difficulty"] = normalize(cell_info["row_difficulty"] + cell_info["col_difficulty"], scale=10)
    cell_info["row_col_difficulty_harmonic"] = normalize((cell_info["row_difficulty"] + 1) * (cell_info["col_difficulty"] + 1), scale=10)

    content_difficulties = cell_info["contents"].apply(lambda cc: df[df.iso.isin(cc)].difficulty.agg(list))
    cell_info["content_difficulty"] = compute_solution_difficulties(content_difficulties)
    cell_info["difficulty"] = normalized_combination(cell_info, CELL_DIFFICULTY_WEIGHTS, scale=10)
    return cell_info

def get_cell_indices(cell_data, cell_info):
    for (cat1, val1), (cat2, val2) in itertools.product(cell_data["rows"], cell_data["cols"]):
        (row_cat, row_val), (col_cat, col_val) = max((cat1, val1), (cat2, val2)), min((cat1, val1), (cat2, val2))
        yield cell_info.index[(cell_info["row_cat"] == row_cat) & (cell_info["row_val"] == row_val) & (cell_info["col_cat"] == col_cat) & (cell_info["col_val"] == col_val)].tolist()[0]


def compute_game_difficulties(games):
    df = preprocessing.df.copy()
    compute_country_difficulties(df)

    df = df[["iso", "name", "difficulty"]]
    category_info = compute_category_difficulties(df)
    cell_info = compute_cell_difficulties(df, category_info)
    
    print(f"Compute difficulty of {len(games)} games...")
    game_info = pd.DataFrame([{"game": game,
                              "rows": [(cat.key, value) for cat, value in game.rows],
                              "cols": [(cat.key, value) for cat, value in game.cols]} for game in games])

    game_info["cell_indices"] = game_info.apply(lambda cell_data: list(get_cell_indices(cell_data, cell_info)), axis=1)
    game_info["cell_difficulties"] = game_info["cell_indices"].apply(lambda ix: cell_info.loc[ix, "difficulty"].tolist())
    game_info["max_cell_difficulty"] = game_info["cell_difficulties"].apply(max)
    game_info["avg_cell_difficulty"] = game_info["cell_difficulties"].apply(np.mean)
    game_info["num_unique"] = game_info["game"].apply(lambda game: len([1 for solutions in sum(game.solutions, []) if len(solutions) == 1]))

    # Final computation and Level assignment
    game_info["difficulty"] = normalized_combination(game_info, GAME_DIFFICULTY_WEIGHTS, scale=10)
    # difficulty_order: "This game is harder than x% of all games."
    game_info["difficulty_order"] = pd.qcut(game_info["avg_cell_difficulty"], q=100, labels=False)
    ix_easy = (game_info["max_cell_difficulty"] < 6) & (game_info["num_unique"] <= 2) & (game_info["difficulty_order"] <= 40)
    hard_bound = game_info[~ix_easy]["difficulty_order"].median()
    ix_medium =  ~ix_easy & (game_info["difficulty_order"] <= hard_bound)
    ix_hard = ~ix_easy & ~ix_medium

    # game_info["class"] = pd.qcut(game_info["difficulty"], q=3, labels=False)
    game_info["level"] = 0
    game_info.loc[ix_easy, "level"] = DifficultyLevel.EASY
    game_info.loc[ix_medium, "level"] = DifficultyLevel.MEDIUM
    game_info.loc[ix_hard, "level"] = DifficultyLevel.HARD

    for i, game in enumerate(games):
        game.data["max_cell_difficulty"] = game_info.loc[i, "max_cell_difficulty"]
        game.data["avg_cell_difficulty"] = game_info.loc[i, "avg_cell_difficulty"]
        game.data["difficulty_level"] = str(game_info.loc[i, "level"])

    return game_info
