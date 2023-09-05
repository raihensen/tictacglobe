
import pandas as pd
from generator import Constraint
from difficulty import DifficultyEstimator, DifficultyLevel
from utils import *
from preprocessing import Preprocessor

# Ensure we're running in the right directory
chdir_this_file()


FIELD_SIZE = 3
MIN_CELL_SIZE = 1
MAX_CELL_SIZE = None

language = "de"


countries = pd.read_json(f"../../data/countries/countries-{language.lower()}.json", encoding="utf8")
preprocessor = Preprocessor(countries=countries,
                            field_size=FIELD_SIZE,
                            min_cell_size=MIN_CELL_SIZE,
                            max_cell_size=MAX_CELL_SIZE)

constraints = [
    # Some categories are pretty boring to appear multiple times
    Constraint.category_at_most("capital_ending_letter", 1),
    Constraint.category_at_most("capital_starting_letter", 1),
    Constraint.category_at_most("ending_letter", 1),
    # Limit the number of cells a country can appear in
    *Constraint.solutions_at_most(countries.iso.tolist(), 3)
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

generator = preprocessor.get_generator(constraints, category_probs,
                                       seed=None, selection_mode="shuffle_setkeys", uniform=False, shuffle=True)
games = list(generator.sample_games(n=1000))

# Difficulty computation
difficulty_info = DifficultyEstimator(preprocessor).compute_game_difficulties(games)

# Save games to JSON file
preprocessor.save_games(games)
