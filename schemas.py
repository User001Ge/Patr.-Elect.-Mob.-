from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class SimulationRequest(BaseModel):
    selected_candidates: list[str] = Field(..., description="სიმულაციაში მონაწილე ზუსტად 3 კანდიდატი")
    iterations: int = Field(default=100, ge=1, le=200_000)
    volatility_level: int = Field(default=3, ge=0, le=10)
    elector_absence_pct: int = Field(default=5, ge=0, le=100)
    candidate_absence_pct: int = Field(default=0, ge=0, le=100)
    rng_seed: int | None = Field(default=None)

    @field_validator("selected_candidates")
    @classmethod
    def validate_selected_candidates(cls, value: list[str]) -> list[str]:
        if len(value) != 3:
            raise ValueError("ზუსტად 3 კანდიდატი უნდა იყოს არჩეული.")
        if len(set(value)) != 3:
            raise ValueError("სამივე კანდიდატი განსხვავებული უნდა იყოს.")
        return value
