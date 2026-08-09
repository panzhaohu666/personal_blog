"""add search_vector to posts

Revision ID: a1b2c3d4e5f6
Revises: cc76854facaa
Create Date: 2026-08-09 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'cc76854facaa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. 添加 search_vector 列（TSVECTOR 类型）
    op.add_column(
        'posts',
        sa.Column('search_vector', postgresql.TSVECTOR(), nullable=True),
    )

    # 2. 创建 GIN 索引加速全文搜索
    op.execute(
        'CREATE INDEX IF NOT EXISTS idx_posts_search_vector '
        'ON posts USING gin(search_vector)'
    )

    # 3. 创建触发器函数：自动更新 search_vector
    op.execute("""
        CREATE OR REPLACE FUNCTION posts_search_vector_update()
        RETURNS trigger AS $$
        BEGIN
            NEW.search_vector = to_tsvector('simple', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.body, ''));
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # 4. 创建触发器：INSERT 或 UPDATE 时自动调用
    op.execute("""
        DROP TRIGGER IF EXISTS trg_posts_search_vector ON posts;
        CREATE TRIGGER trg_posts_search_vector
        BEFORE INSERT OR UPDATE OF title, body ON posts
        FOR EACH ROW EXECUTE FUNCTION posts_search_vector_update();
    """)

    # 5. 回填已有数据的 search_vector
    op.execute("""
        UPDATE posts
        SET search_vector = to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(body, ''))
    """)


def downgrade() -> None:
    # 移除触发器
    op.execute('DROP TRIGGER IF EXISTS trg_posts_search_vector ON posts')
    # 移除触发器函数
    op.execute('DROP FUNCTION IF EXISTS posts_search_vector_update()')
    # 移除 GIN 索引
    op.execute('DROP INDEX IF EXISTS idx_posts_search_vector')
    # 移除列
    op.drop_column('posts', 'search_vector')
