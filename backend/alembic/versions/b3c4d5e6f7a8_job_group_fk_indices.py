"""job_group_fk_indices

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-04-28 12:30:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_job_groups_customer_id', 'job_groups', ['customer_id'])
    op.create_index('ix_job_groups_vehicle_id', 'job_groups', ['vehicle_id'])


def downgrade() -> None:
    op.drop_index('ix_job_groups_vehicle_id', table_name='job_groups')
    op.drop_index('ix_job_groups_customer_id', table_name='job_groups')
