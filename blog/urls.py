from django.urls import path, include
from . import views

app_name = 'blog'

urlpatterns = [
    path('', views.post_list, name='post_list'),
    path('post/<slug:slug>/', views.post_detail, name='post_detail'),
    path('category/<slug:slug>/', views.category_posts, name='category_posts'),
]

manage_patterns = [
    path('posts/', views.manage_posts, name='manage_posts'),
    path('posts/create/', views.create_post, name='create_post'),
    path('posts/<int:post_id>/edit/', views.edit_post, name='edit_post'),
    path('posts/<int:post_id>/delete/', views.delete_post, name='delete_post'),
    path('categories/', views.manage_categories, name='manage_categories'),
    path('categories/<int:cat_id>/delete/', views.delete_category, name='delete_category'),
    path('tags/', views.manage_tags, name='manage_tags'),
    path('tags/<int:tag_id>/delete/', views.delete_tag, name='delete_tag'),
    path('system/', views.system, name='system'),
]

urlpatterns += [
    path('manage/', include((manage_patterns, 'blog'), namespace='manage')),
]
