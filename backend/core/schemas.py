from typing import Literal
from pydantic import BaseModel, EmailStr, Field, HttpUrl, model_validator


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class ProjectIn(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    brief: str = Field(min_length=30, max_length=6000)
    client_email: EmailStr
    amount_cents: int = Field(ge=100, le=100_000_000)
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    due_date: str = Field(min_length=8, max_length=20)


class CriterionIn(BaseModel):
    description: str = Field(min_length=3, max_length=1000)
    check_type: Literal["url", "routes", "evidence"]
    expected: str = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def valid_route_count(self):
        if self.check_type == "routes" and (not self.expected.isdigit() or not 1 <= int(self.expected) <= 100):
            raise ValueError("A route check needs a page count from 1 to 100")
        return self


class ScopeItemIn(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    description: str = Field(min_length=3, max_length=2000)
    criteria: list[CriterionIn] = Field(min_length=1, max_length=10)


class AgreementEditIn(BaseModel):
    summary: str = Field(min_length=20, max_length=4000)
    ambiguities: list[str] = Field(default_factory=list, max_length=20)
    out_of_scope: list[str] = Field(default_factory=list, max_length=30)
    items: list[ScopeItemIn] | None = Field(default=None, min_length=1, max_length=20)


class ConfirmIn(BaseModel):
    confirmed: bool


class DeliveryIn(BaseModel):
    url: HttpUrl
    summary: str = Field(min_length=20, max_length=4000)
    evidence: list[str] = Field(min_length=1, max_length=30)


class ResolutionIn(BaseModel):
    reason: str = Field(min_length=20, max_length=4000)


class ProposalIn(BaseModel):
    kind: str = Field(pattern=r"^(revision|partial_refund|adjusted_final_payment|paid_change_order)$")
    title: str = Field(min_length=3, max_length=180)
    description: str = Field(min_length=10, max_length=2000)
    amount_cents: int = Field(default=0, ge=0)
