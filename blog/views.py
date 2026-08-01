from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Count, Q
from .models import Post, Category, Tag
from .forms import PostForm, CategoryForm, TagForm


def login(request):
    if request.method == 'POST':
        username = request.POST.get('username', '')
        password = request.POST.get('password', '')
        user = authenticate(request, username=username, password=password)

        if user is not None:
            auth_login(request, user)
            return redirect('home')
        else:
            messages.error(request, '用户名或密码错误')

    return render(request, 'login.html')


def logout(request):
    auth_logout(request)
    return redirect('login')


@login_required(login_url='login')
def home(request):
    return render(request, 'home.html')


# ======================== 博客前端视图 ========================

def post_list(request):
    """文章列表页"""
    posts = Post.objects.filter(status='published').select_related('category').prefetch_related('tags')
    categories = Category.objects.annotate(post_count=Count('posts', filter=Q(posts__status='published')))
    context = {
        'posts': posts,
        'categories': categories,
    }
    return render(request, 'blog/post_list.html', context)


def post_detail(request, slug):
    """文章详情页"""
    post = get_object_or_404(
        Post.objects.select_related('category').prefetch_related('tags'),
        slug=slug,
        status='published',
    )
    context = {'post': post}
    return render(request, 'blog/post_detail.html', context)


def category_posts(request, slug):
    """按分类筛选文章"""
    category = get_object_or_404(Category, slug=slug)
    posts = Post.objects.filter(category=category, status='published')
    categories = Category.objects.annotate(post_count=Count('posts', filter=Q(posts__status='published')))
    context = {
        'posts': posts,
        'categories': categories,
        'current_category': category,
    }
    return render(request, 'blog/post_list.html', context)


# ======================== 管理后台视图 ========================

@login_required(login_url='login')
def manage_posts(request):
    """管理所有文章（含草稿），支持筛选和搜索"""
    posts = Post.objects.select_related('category').prefetch_related('tags').all()

    # 筛选
    status = request.GET.get('status', '')
    category_id = request.GET.get('category', '')
    search = request.GET.get('search', '')

    if status:
        posts = posts.filter(status=status)
    if category_id:
        posts = posts.filter(category_id=category_id)
    if search:
        posts = posts.filter(title__icontains=search)

    categories = Category.objects.all()
    context = {
        'posts': posts,
        'categories': categories,
        'current_status': status,
        'current_category': category_id,
        'current_search': search,
        'manage_posts_active': ('manage_posts', 'edit_post', 'delete_post'),
    }
    return render(request, 'manage/post_list.html', context)


@login_required(login_url='login')
def create_post(request):
    """创建新文章"""
    if request.method == 'POST':
        form = PostForm(request.POST)
        if form.is_valid():
            post = form.save()
            messages.success(request, f'文章「{post.title}」创建成功')
            return redirect('blog:manage:manage_posts')
    else:
        form = PostForm()
    context = {
        'form': form,
        'action': 'create',
        'manage_posts_active': (),
        'has_categories': Category.objects.exists(),
        'has_tags': Tag.objects.exists(),
    }
    return render(request, 'manage/post_form.html', context)


@login_required(login_url='login')
def edit_post(request, post_id):
    """编辑已有文章"""
    post = get_object_or_404(Post, id=post_id)
    if request.method == 'POST':
        form = PostForm(request.POST, instance=post)
        if form.is_valid():
            form.save()
            messages.success(request, f'文章「{post.title}」更新成功')
            return redirect('blog:manage:manage_posts')
    else:
        form = PostForm(instance=post)
    context = {
        'form': form,
        'action': 'edit',
        'post': post,
        'manage_posts_active': ('edit_post',),
        'has_categories': Category.objects.exists(),
        'has_tags': Tag.objects.exists(),
    }
    return render(request, 'manage/post_form.html', context)


@login_required(login_url='login')
def delete_post(request, post_id):
    """删除文章（仅 POST）"""
    post = get_object_or_404(Post, id=post_id)
    if request.method == 'POST':
        title = post.title
        post.delete()
        messages.success(request, f'文章「{title}」已删除')
    return redirect('blog:manage:manage_posts')


@login_required(login_url='login')
def manage_categories(request):
    """管理分类 —— 列表 + 内联添加"""
    categories = Category.objects.annotate(
        post_count=Count('posts')
    ).all()
    if request.method == 'POST':
        form = CategoryForm(request.POST)
        if form.is_valid():
            category = form.save()
            messages.success(request, f'分类「{category.name}」添加成功')
            return redirect('blog:manage:manage_categories')
    else:
        form = CategoryForm()
    context = {
        'categories': categories,
        'form': form,
        'manage_categories_active': ('manage_categories', 'delete_category'),
    }
    return render(request, 'manage/category_list.html', context)


@login_required(login_url='login')
def delete_category(request, cat_id):
    """删除分类（仅 POST）"""
    category = get_object_or_404(Category, id=cat_id)
    if request.method == 'POST':
        name = category.name
        category.delete()
        messages.success(request, f'分类「{name}」已删除')
    return redirect('blog:manage:manage_categories')


@login_required(login_url='login')
def manage_tags(request):
    """管理标签 —— 列表 + 内联添加"""
    tags = Tag.objects.annotate(
        post_count=Count('posts')
    ).all()
    if request.method == 'POST':
        form = TagForm(request.POST)
        if form.is_valid():
            tag = form.save()
            messages.success(request, f'标签「{tag.name}」添加成功')
            return redirect('blog:manage:manage_tags')
    else:
        form = TagForm()
    context = {
        'tags': tags,
        'form': form,
        'manage_tags_active': ('manage_tags', 'delete_tag'),
    }
    return render(request, 'manage/tag_list.html', context)


@login_required(login_url='login')
def delete_tag(request, tag_id):
    """删除标签（仅 POST）"""
    tag = get_object_or_404(Tag, id=tag_id)
    if request.method == 'POST':
        name = tag.name
        tag.delete()
        messages.success(request, f'标签「{name}」已删除')
    return redirect('blog:manage:manage_tags')


@login_required(login_url='login')
def system(request):
    if request.method == 'POST':
        action = request.POST.get('action', '')

        if action == 'password':
            old_password = request.POST.get('old_password', '')
            new_password = request.POST.get('new_password', '')
            confirm = request.POST.get('confirm_password', '')

            if not request.user.check_password(old_password):
                messages.error(request, '当前密码不正确')
            elif new_password != confirm:
                messages.error(request, '两次输入的新密码不一致')
            elif len(new_password) < 6:
                messages.error(request, '新密码长度不能少于 6 位')
            else:
                request.user.set_password(new_password)
                request.user.save()
                auth_login(request, request.user)
                messages.success(request, '密码修改成功')

        elif action == 'email':
            email = request.POST.get('email', '').strip()
            request.user.email = email
            request.user.save()
            messages.success(request, '邮箱更新成功')

    return render(request, 'manage/system.html')
