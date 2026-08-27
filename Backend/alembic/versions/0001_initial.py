"""Initial migration

Revision ID: 0001
Revises: 
Create Date: 2026-01-27

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Create enums first
    casestatus = postgresql.ENUM('open', 'active', 'closed', 'archived', name='casestatus', create_type=False)
    casestatus.create(op.get_bind(), checkfirst=True)
    casepriority = postgresql.ENUM('low', 'medium', 'high', 'critical', name='casepriority', create_type=False)
    casepriority.create(op.get_bind(), checkfirst=True)
    caseclassification = postgresql.ENUM('unclassified', 'confidential', 'secret', 'top_secret', name='caseclassification', create_type=False)
    caseclassification.create(op.get_bind(), checkfirst=True)
    artifactsourcetype = postgresql.ENUM('file', 'url', 'database', 'api', 'manual', name='artifactsourcetype', create_type=False)
    artifactsourcetype.create(op.get_bind(), checkfirst=True)
    entitytype = postgresql.ENUM('actor', 'alias', 'account', 'wallet', 'domain', 'ip', 'document', 'infrastructure', name='entitytype', create_type=False)
    entitytype.create(op.get_bind(), checkfirst=True)
    signaltype = postgresql.ENUM('stylometry', 'blockchain', 'osint', 'technical_fingerprint', 'temporal', name='signaltype', create_type=False)
    signaltype.create(op.get_bind(), checkfirst=True)
    reviewdecision = postgresql.ENUM('confirm_lead', 'reject_lead', 'mark_requires_review', 'add_note', name='reviewdecision', create_type=False)
    reviewdecision.create(op.get_bind(), checkfirst=True)
    auditeventtype = postgresql.ENUM('login', 'case_created', 'case_viewed', 'artifact_added', 'evidence_viewed', 'analysis_started', 'analysis_completed', 'entity_resolved', 'graph_viewed', 'review_created', 'report_generated', 'case_updated', 'entity_created', 'entity_updated', name='auditeventtype', create_type=False)
    auditeventtype.create(op.get_bind(), checkfirst=True)

    # Use metadata to create all tables
    from app.core.database import Base
    from app.models import *  # noqa: ensure all models are imported
    Base.metadata.create_all(bind=op.get_bind())

def downgrade() -> None:
    from app.core.database import Base
    from app.models import *
    Base.metadata.drop_all(bind=op.get_bind())
    # Drop enums
    for name in ['auditeventtype','reviewdecision','signaltype','entitytype','artifactsourcetype','caseclassification','casepriority','casestatus']:
        sa.Enum(name=name).drop(op.get_bind(), checkfirst=True)
