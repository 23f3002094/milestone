from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    primary_role: Mapped[str] = mapped_column(String(20))
    company: Mapped[str | None] = mapped_column(String(160))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(180))
    brief: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="agreement_review")
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    budget_cents: Mapped[int] = mapped_column(Integer)
    due_date: Mapped[str] = mapped_column(String(20))
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    memberships: Mapped[list["ProjectMembership"]] = relationship(cascade="all, delete-orphan")
    milestones: Mapped[list["Milestone"]] = relationship(cascade="all, delete-orphan")
    agreements: Mapped[list["AgreementVersion"]] = relationship(cascade="all, delete-orphan")


class ProjectMembership(Base):
    __tablename__ = "project_memberships"
    __table_args__ = (UniqueConstraint("project_id", "user_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    role: Mapped[str] = mapped_column(String(20))
    invited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    user: Mapped[User] = relationship()


class AgreementVersion(Base):
    __tablename__ = "agreement_versions"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    version: Mapped[int] = mapped_column(Integer)
    summary: Mapped[str] = mapped_column(Text)
    ambiguities: Mapped[str] = mapped_column(Text, default="")
    out_of_scope: Mapped[str] = mapped_column(Text, default="")
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    scope_items: Mapped[list["ScopeItem"]] = relationship(cascade="all, delete-orphan")
    approvals: Mapped[list["Approval"]] = relationship(cascade="all, delete-orphan")


class ScopeItem(Base):
    __tablename__ = "scope_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    agreement_version_id: Mapped[int] = mapped_column(ForeignKey("agreement_versions.id"))
    title: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    criteria: Mapped[list["AcceptanceCriterion"]] = relationship(cascade="all, delete-orphan")


class AcceptanceCriterion(Base):
    __tablename__ = "acceptance_criteria"
    id: Mapped[int] = mapped_column(primary_key=True)
    scope_item_id: Mapped[int] = mapped_column(ForeignKey("scope_items.id"))
    description: Mapped[str] = mapped_column(Text)
    check_type: Mapped[str] = mapped_column(String(30), default="evidence")
    expected: Mapped[str] = mapped_column(String(255))


class Approval(Base):
    __tablename__ = "approvals"
    __table_args__ = (UniqueConstraint("agreement_version_id", "user_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    agreement_version_id: Mapped[int] = mapped_column(ForeignKey("agreement_versions.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    role: Mapped[str] = mapped_column(String(20))
    approved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Milestone(Base):
    __tablename__ = "milestones"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    title: Mapped[str] = mapped_column(String(180))
    amount_cents: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3))
    status: Mapped[str] = mapped_column(String(40), default="awaiting_payment")
    due_date: Mapped[str] = mapped_column(String(20))
    deliverables: Mapped[list["Deliverable"]] = relationship(cascade="all, delete-orphan")
    orders: Mapped[list["PaypalOrder"]] = relationship(cascade="all, delete-orphan")


class Deliverable(Base):
    __tablename__ = "deliverables"
    id: Mapped[int] = mapped_column(primary_key=True)
    milestone_id: Mapped[int] = mapped_column(ForeignKey("milestones.id"))
    submitted_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    url: Mapped[str] = mapped_column(Text)
    summary: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    evidence: Mapped[list["Evidence"]] = relationship(cascade="all, delete-orphan")
    evaluations: Mapped[list["Evaluation"]] = relationship(cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"
    id: Mapped[int] = mapped_column(primary_key=True)
    deliverable_id: Mapped[int] = mapped_column(ForeignKey("deliverables.id"))
    label: Mapped[str] = mapped_column(String(180))
    url: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str] = mapped_column(Text, default="")


class Evaluation(Base):
    __tablename__ = "evaluations"
    id: Mapped[int] = mapped_column(primary_key=True)
    deliverable_id: Mapped[int] = mapped_column(ForeignKey("deliverables.id"))
    criterion_id: Mapped[int] = mapped_column(ForeignKey("acceptance_criteria.id"))
    passed: Mapped[bool] = mapped_column(Boolean)
    detail: Mapped[str] = mapped_column(Text)
    advisory: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class PaypalOrder(Base):
    __tablename__ = "paypal_orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    milestone_id: Mapped[int] = mapped_column(ForeignKey("milestones.id"))
    provider_id: Mapped[str] = mapped_column(String(120), unique=True)
    status: Mapped[str] = mapped_column(String(40))
    amount_cents: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3))
    mode: Mapped[str] = mapped_column(String(20))
    approval_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    captures: Mapped[list["PaypalCapture"]] = relationship(cascade="all, delete-orphan")


class PaypalCapture(Base):
    __tablename__ = "paypal_captures"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("paypal_orders.id"))
    provider_id: Mapped[str] = mapped_column(String(120), unique=True)
    status: Mapped[str] = mapped_column(String(40))
    amount_cents: Mapped[int] = mapped_column(Integer)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    refunds: Mapped[list["PaypalRefund"]] = relationship(cascade="all, delete-orphan")


class PaypalRefund(Base):
    __tablename__ = "paypal_refunds"
    id: Mapped[int] = mapped_column(primary_key=True)
    capture_id: Mapped[int] = mapped_column(ForeignKey("paypal_captures.id"))
    provider_id: Mapped[str] = mapped_column(String(120), unique=True)
    status: Mapped[str] = mapped_column(String(40))
    amount_cents: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ResolutionCase(Base):
    __tablename__ = "resolution_cases"
    id: Mapped[int] = mapped_column(primary_key=True)
    milestone_id: Mapped[int] = mapped_column(ForeignKey("milestones.id"))
    opened_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    proposals: Mapped[list["ResolutionProposal"]] = relationship(cascade="all, delete-orphan")


class ResolutionProposal(Base):
    __tablename__ = "resolution_proposals"
    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("resolution_cases.id"))
    kind: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text)
    amount_cents: Mapped[int] = mapped_column(Integer, default=0)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    approvals: Mapped[list["PartyApproval"]] = relationship(cascade="all, delete-orphan")


class PartyApproval(Base):
    __tablename__ = "party_approvals"
    __table_args__ = (UniqueConstraint("proposal_id", "user_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    proposal_id: Mapped[int] = mapped_column(ForeignKey("resolution_proposals.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    role: Mapped[str] = mapped_column(String(20))
    approved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AiReview(Base):
    __tablename__ = "ai_reviews"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    agreement_id: Mapped[int] = mapped_column(ForeignKey("agreement_versions.id"))
    deliverable_id: Mapped[int] = mapped_column(ForeignKey("deliverables.id"))
    resolution_case_id: Mapped[int | None] = mapped_column(ForeignKey("resolution_cases.id"))
    requested_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    event_type: Mapped[str] = mapped_column(String(80))
    detail: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    actor: Mapped[User | None] = relationship()
