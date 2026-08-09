"""访问统计相关的 Pydantic 数据模型。"""
from pydantic import BaseModel, Field


class StatsOverview(BaseModel):
    """站点总览统计"""
    total_posts: int = Field(..., description="总文章数")
    published_posts: int = Field(..., description="已发布文章数")
    total_views: int = Field(..., description="总访问量")
    total_categories: int = Field(..., description="分类数")
    total_tags: int = Field(..., description="标签数")


class PostStats(BaseModel):
    """单篇文章访问统计"""
    post_id: str = Field(..., description="文章 ID")
    post_title: str = Field(..., description="文章标题")
    view_count: int = Field(..., description="总访问量")
    today_views: int = Field(default=0, description="今日访问量")


class DailyStats(BaseModel):
    """每日访问统计"""
    date: str = Field(..., description="日期（YYYY-MM-DD）")
    views: int = Field(..., description="当日访问量")
    unique_visitors: int = Field(default=0, description="独立访客数")
