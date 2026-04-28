"""job_group_template

Revision ID: a2b3c4d5e6f7
Revises: 9cdfe8c7bd83
Create Date: 2026-04-28 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = '9cdfe8c7bd83'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add template columns to job_groups
    op.add_column('job_groups', sa.Column('customer_id', sa.Integer(), nullable=True))
    op.add_column('job_groups', sa.Column('vehicle_id', sa.Integer(), nullable=True))
    op.add_column('job_groups', sa.Column('default_revenue', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'))
    op.add_column('job_groups', sa.Column('default_driver_payroll', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'))
    op.add_column('job_groups', sa.Column('recurrence', sa.String(length=20), nullable=False, server_default='one_time'))

    op.create_foreign_key('fk_job_groups_customer_id', 'job_groups', 'customers', ['customer_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_job_groups_vehicle_id', 'job_groups', 'vehicles', ['vehicle_id'], ['id'], ondelete='SET NULL')

    # Remove recurrence and end_date from jobs
    op.drop_column('jobs', 'recurrence')
    op.drop_column('jobs', 'end_date')


def downgrade() -> None:
    # Restore jobs columns
    op.add_column('jobs', sa.Column('end_date', sa.String(length=10), nullable=True))
    op.add_column('jobs', sa.Column('recurrence', sa.String(length=20), nullable=False, server_default='one_time'))

    # Remove job_groups template columns
    op.drop_constraint('fk_job_groups_vehicle_id', 'job_groups', type_='foreignkey')
    op.drop_constraint('fk_job_groups_customer_id', 'job_groups', type_='foreignkey')
    op.drop_column('job_groups', 'recurrence')
    op.drop_column('job_groups', 'default_driver_payroll')
    op.drop_column('job_groups', 'default_revenue')
    op.drop_column('job_groups', 'vehicle_id')
    op.drop_column('job_groups', 'customer_id')
