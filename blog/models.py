from django.db import models
from django.urls import reverse
from django.utils.text import slugify
import uuid


def make_slug(name):
    """生成 slug，中文回退到 uuid"""
    result = slugify(name)
    return result if result else str(uuid.uuid4())[:8]


class Category(models.Model):
    name = models.CharField('分类名称', max_length=100, unique=True)
    slug = models.SlugField('URL 标识', max_length=100, unique=True)

    class Meta:
        verbose_name = '分类'
        verbose_name_plural = '分类'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = make_slug(self.name)
        super().save(*args, **kwargs)


class Tag(models.Model):
    name = models.CharField('标签名称', max_length=50, unique=True)
    slug = models.SlugField('URL 标识', max_length=50, unique=True)

    class Meta:
        verbose_name = '标签'
        verbose_name_plural = '标签'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = make_slug(self.name)
        super().save(*args, **kwargs)


class Post(models.Model):
    STATUS_CHOICES = (
        ('draft', '草稿'),
        ('published', '已发布'),
    )

    title = models.CharField('标题', max_length=200)
    slug = models.SlugField('URL 标识', max_length=200, unique=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='posts',
        verbose_name='分类',
    )
    tags = models.ManyToManyField(Tag, blank=True, related_name='posts', verbose_name='标签')
    excerpt = models.TextField('摘要', max_length=500, blank=True)
    body = models.TextField('正文')
    status = models.CharField('状态', max_length=10, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '文章'
        verbose_name_plural = '文章'
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = make_slug(self.title)
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse('blog:post_detail', kwargs={'slug': self.slug})
