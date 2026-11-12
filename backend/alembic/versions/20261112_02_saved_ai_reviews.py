"""Persist advisory reviews with their agreement and delivery context."""
from alembic import op
from core.models import AiReview

revision = "20261112_02"
down_revision = "20261030_01"
branch_labels = None
depends_on = None


def upgrade():
    AiReview.__table__.create(bind=op.get_bind(), checkfirst=True)


def downgrade():
    AiReview.__table__.drop(bind=op.get_bind(), checkfirst=True)
