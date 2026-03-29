from __future__ import annotations

from pathlib import Path
from typing import Any

from data_loader import PreferenceFileError, build_preference_matrix, load_model_from_excel
from election_engine import SimulationParameters, run_monte_carlo, run_single_simulation
from schemas import SimulationRequest

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "preferences.xlsx"


def get_data_file_path() -> Path:
    return DATA_FILE


def load_current_model():
    return load_model_from_excel(DATA_FILE)


def get_model_overview() -> dict[str, Any]:
    model = load_current_model()
    return {
        "data_file": DATA_FILE.name,
        "data_file_path": str(DATA_FILE),
        "candidate_count": len(model.candidates),
        "elector_count": len(model.electors),
        "candidates": model.candidates,
        "default_candidates": model.candidates[:3],
    }


def build_simulation_payload(request: SimulationRequest) -> dict[str, Any]:
    model = load_current_model()

    params = SimulationParameters(
        selected_candidates=request.selected_candidates,
        volatility_level=request.volatility_level,
        elector_absence_probability=request.elector_absence_pct / 100,
        candidate_absence_probability=request.candidate_absence_pct / 100,
    )

    single_result = run_single_simulation(model, params)
    monte_carlo_result = run_monte_carlo(model, params, request.iterations, rng_seed=request.rng_seed)

    winner_note = (
        "პირველივე ტურში დაფიქსირდა გამარჯვება."
        if not single_result["runoff_required"]
        else "გამარჯვებული გამოვლინდა მეორე ტურის შემდეგ."
    )
    if single_result["winner"] == "მეორე ტურის შემადგენლობა გაურკვეველია":
        winner_note = "პირველ ტურში შედეგი ისე დასრულდა, რომ მეორე ტურის შემადგენლობა გარკვევით ვერ დადგინდა."

    first_round = single_result["first_round"]
    runoff = single_result["runoff"]

    return {
        "data_source": {
            "file_name": DATA_FILE.name,
            "file_path": str(DATA_FILE),
        },
        "model": {
            "candidate_count": len(model.candidates),
            "elector_count": len(model.electors),
            "all_candidates": model.candidates,
            "all_electors": model.electors,
        },
        "parameters": {
            "selected_candidates": request.selected_candidates,
            "iterations": request.iterations,
            "volatility_level": request.volatility_level,
            "elector_absence_pct": request.elector_absence_pct,
            "candidate_absence_pct": request.candidate_absence_pct,
            "rng_seed": request.rng_seed,
        },
        "single_run": {
            "winner": single_result["winner"],
            "winner_note": winner_note,
            "runoff_required": single_result["runoff_required"],
            "runoff_candidates": single_result["runoff_candidates"],
            "attendance_count": single_result["attendance_count"],
            "absence_count": single_result["absence_count"],
            "absent_candidates": single_result["absent_candidates"],
            "participating_electors": single_result["participating_electors"],
            "absent_electors": single_result["absent_electors"],
            "first_round": {
                "valid_votes": first_round["valid_votes"],
                "majority_threshold": first_round["majority_threshold"],
                "status": (
                    "მეორე ტური"
                    if single_result["runoff_required"]
                    else "გამარჯვებული გამოვლინდა"
                ),
                "vote_totals": first_round["vote_totals"],
                "vote_table": first_round["vote_table"],
                "details_table": first_round["details_table"],
            },
            "runoff": (
                {
                    "valid_votes": runoff["valid_votes"],
                    "majority_threshold": runoff["majority_threshold"],
                    "winner": single_result["winner"],
                    "vote_totals": runoff["vote_totals"],
                    "vote_table": runoff["vote_table"],
                    "details_table": runoff["details_table"],
                }
                if runoff is not None
                else None
            ),
        },
        "monte_carlo": {
            "iterations": request.iterations,
            "probabilities_table": monte_carlo_result["probabilities_table"],
            "first_round_win_table": monte_carlo_result["first_round_win_table"],
            "average_votes_table": monte_carlo_result["average_votes_table"],
            "avg_attendance": monte_carlo_result["avg_attendance"],
            "runoff_rate_pct": monte_carlo_result["runoff_rate_pct"],
        },
        "preference_matrix": build_preference_matrix(model),
    }


def ensure_data_file_exists() -> None:
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"მონაცემთა ფაილი ვერ მოიძებნა: {DATA_FILE}")
