"""Initial normalized relational schema."""
from alembic import op
from sqlalchemy import inspect, text

from core.database import Base
from core import models  # noqa: F401

revision = "20261030_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    inspector = inspect(connection)
    if "projects" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("projects")}
        if columns == {"id", "data", "updated_at"}:
            connection.execute(text("ALTER TABLE projects RENAME TO legacy_project_blobs"))
    Base.metadata.create_all(bind=connection)


def downgrade():
    Base.metadata.drop_all(bind=op.get_bind())
