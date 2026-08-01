from django import forms
from .models import Post, Category, Tag


class PostForm(forms.ModelForm):
    """文章表单 —— 创建 / 编辑文章"""

    class Meta:
        model = Post
        fields = '__all__'
        widgets = {
            'excerpt': forms.Textarea(attrs={'rows': 3}),
            'body': forms.Textarea(attrs={'rows': 20}),
            'status': forms.RadioSelect,
        }
        labels = {
            'title': '标题',
            'slug': 'URL 标识',
            'category': '分类',
            'tags': '标签',
            'excerpt': '摘要',
            'body': '正文',
            'status': '状态',
        }


class CategoryForm(forms.ModelForm):
    """分类表单 —— 内联添加分类"""

    class Meta:
        model = Category
        fields = ['name']
        labels = {
            'name': '分类名称',
        }


class TagForm(forms.ModelForm):
    """标签表单 —— 内联添加标签"""

    class Meta:
        model = Tag
        fields = ['name']
        labels = {
            'name': '标签名称',
        }
