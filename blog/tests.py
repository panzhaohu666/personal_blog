from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from .models import Post, Category, Tag


class PostModelTest(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name='Python')
        self.tag = Tag.objects.create(name='Django')

    def test_post_creation(self):
        post = Post.objects.create(
            title='测试文章',
            body='这是测试正文内容。',
            category=self.category,
            status='published',
        )
        post.tags.add(self.tag)
        self.assertEqual(post.title, '测试文章')
        self.assertEqual(post.status, 'published')
        self.assertEqual(post.category, self.category)
        self.assertIn(self.tag, post.tags.all())
        self.assertTrue(post.created_at)
        self.assertTrue(post.updated_at)

    def test_slug_auto_generation(self):
        post = Post.objects.create(title='Hello World', body='content')
        self.assertTrue(post.slug)
        self.assertIn('hello-world', post.slug)

    def test_str_method(self):
        post = Post.objects.create(title='My Post', body='content')
        self.assertEqual(str(post), 'My Post')


class CategoryModelTest(TestCase):
    def test_category_creation(self):
        category = Category.objects.create(name='Python')
        self.assertEqual(category.name, 'Python')

    def test_slug_auto_generation(self):
        category = Category.objects.create(name='机器学习')
        self.assertTrue(category.slug)

    def test_str_representation(self):
        category = Category.objects.create(name='Python')
        self.assertEqual(str(category), 'Python')


class PostListViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.category = Category.objects.create(name='Python')
        Post.objects.create(
            title='Published Post',
            body='Published body',
            category=self.category,
            status='published',
        )
        Post.objects.create(
            title='Draft Post',
            body='Draft body',
            category=self.category,
            status='draft',
        )

    def test_post_list_returns_200(self):
        response = self.client.get(reverse('blog:post_list'))
        self.assertEqual(response.status_code, 200)

    def test_post_list_uses_correct_template(self):
        response = self.client.get(reverse('blog:post_list'))
        self.assertTemplateUsed(response, 'blog/post_list.html')

    def test_post_list_only_shows_published(self):
        response = self.client.get(reverse('blog:post_list'))
        self.assertContains(response, 'Published Post')
        self.assertNotContains(response, 'Draft Post')


class PostDetailViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.category = Category.objects.create(name='Python')
        self.published_post = Post.objects.create(
            title='Published Post',
            body='Published body',
            category=self.category,
            status='published',
        )
        self.draft_post = Post.objects.create(
            title='Draft Post',
            body='Draft body',
            category=self.category,
            status='draft',
        )

    def test_detail_view_returns_200_for_published(self):
        url = reverse('blog:post_detail', kwargs={'slug': self.published_post.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Published Post')

    def test_detail_view_returns_404_for_draft(self):
        url = reverse('blog:post_detail', kwargs={'slug': self.draft_post.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)


class LoginTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='admin',
            password='testpass123',
        )

    def test_login_with_correct_credentials(self):
        response = self.client.post(reverse('login'), {
            'username': 'admin',
            'password': 'testpass123',
        })
        self.assertRedirects(response, reverse('home'))

    def test_login_with_wrong_credentials(self):
        response = self.client.post(reverse('login'), {
            'username': 'admin',
            'password': 'wrongpassword',
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '用户名或密码错误')

    def test_login_page_returns_200(self):
        response = self.client.get(reverse('login'))
        self.assertEqual(response.status_code, 200)
