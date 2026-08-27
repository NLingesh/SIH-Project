"""Add intelligence_jobs

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-28
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    collectionstatus = postgresql.ENUM('ready', 'running', 'completed', 'failed', 'requires_review', name='collectionstatus', create_type=False)
    collectionstatus.create(op.get_bind(), checkfirst=True)
    from app.core.database import Base
    from app.models import *  # noqa
    Base.metadata.create_all(bind=op.get_bind(), tables=[Base.metadata.tables['intelligence_jobs']])

def downgrade() -> None:
    op.drop_table('intelligence_jobs')
    sa.Enum(name='collectionstatus').drop(op.get_bind(), checkfirst=True)
