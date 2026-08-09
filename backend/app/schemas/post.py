"""文章相关的 Pydantic 数据模型。

定义文章的创建、更新、列表查询、详情响应等 schema。
"""
from datetime import datetime
from pydantic import BaseModel, Field


class CategoryResponse(BaseModel):
    """分类响应"""
    id: str = Field(..., description="分类 ID（UUID）")
    name: str = Field(..., description="分类名称")
    slug: str = Field(..., description="URL 标识")
    post_count: int = Field(default=0, description="文章数量")

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    """创建分类请求"""
    name: str = Field(..., min_length=1, max_length=100, description="分类名称")


class TagResponse(BaseModel):
    """标签响应"""
    id: str = Field(..., description="标签 ID（UUID）")
    name: str = Field(..., description="标签名称")
    slug: str = Field(..., description="URL 标识")
    post_count: int = Field(default=0, description="文章数量")

    class Config:
        from_attributes = True


class TagCreate(BaseModel):
    """创建标签请求"""
    name: str = Field(..., min_length=1, max_length=50, description="标签名称")


class PostCreate(BaseModel):
    """创建/更新文章请求"""
    title: str = Field(..., min_length=1, max_length=200, description="文章标题")
    slug: str | None = Field(default=None, max_length=200, description="URL 标识，留空自动生成")
    category_id: str | None = Field(default=None, description="分类 ID（UUID）")
    tag_ids: list[str] = Field(default_factory=list, description="标签 ID 列表")
    excerpt: str = Field(default="", max_length=500, description="摘要")
    body: str = Field(..., min_length=1, description="正文（Markdown）")
    status: str = Field(default="draft", pattern="^(draft|published)$", description="状态：draft 草稿 | published 已发布")
    image_url: str | None = Field(default=None, description="封面图片 URL")


class PostUpdate(PostCreate):
    """更新文章请求（与创建相同字段）"""
    pass


class PostSummary(BaseModel):
    """文章列表项（摘要，不含正文）"""
    id: str
    title: str
    slug: str
    category: CategoryResponse | None = None
    tags: list[TagResponse] = Field(default_factory=list)
    excerpt: str = ""
    image_url: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    view_count: int = Field(default=0, description="访问量（来自 Redis）")

    class Config:
        from_attributes = True


class PostDetail(PostSummary):
    """文章详情（含正文）"""
    body: str = Field(..., description="正文（Markdown）")


class PostListResponse(BaseModel):
    """文章列表分页响应"""
    items: list[PostSummary]
    total: int = Field(..., description="总文章数")
    page: int = Field(..., description="当前页码")
    size: int = Field(..., description="每页数量")
    pages: int = Field(..., description="总页数")


class SearchResult(BaseModel):
    """搜索结果"""
    query: str = Field(..., description="搜索关键词")
    engine: str = Field(..., description="搜索引擎（ilike/tsvector/elasticsearch）")
    took_ms: float = Field(..., description="搜索耗时（毫秒）")
    items: list[PostSummary]
    total: int
    page: int
    size: int


class UploadResponse(BaseModel):
    """图片上传响应"""
    url: str = Field(..., description="图片访问 URL")
    filename: str = Field(..., description="原始文件名")
    size: int = Field(..., description="文件大小（字节）")
