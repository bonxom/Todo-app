import { test, expect, type Page } from '@playwright/test';

const MOCK_USER = {
  _id: 'user-e2e-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
  avatarUrl: '',
};

const MOCK_TASKS = [
  {
    _id: 'task-1',
    title: 'E2E Test Task 1',
    description: 'First test task for E2E validation',
    status: 'in-progress',
    priority: 'High',
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    completedAt: null,
    projectId: null,
    categoryId: null,
  },
  {
    _id: 'task-2',
    title: 'E2E Test Task 2',
    description: 'Second test task for E2E validation',
    status: 'completed',
    priority: 'Medium',
    dueDate: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    projectId: null,
    categoryId: null,
  },
];

const MOCK_PROJECTS = [
  {
    _id: 'proj-1',
    name: 'E2E Test Project',
    description: 'Test project description',
    color: '#3B82F6',
    status: 'active',
    tasks: [],
  },
];

const MOCK_CATEGORIES = [
  {
    _id: 'cat-1',
    name: 'E2E Work',
    description: 'Work category',
  },
];

const MOCK_STATS = {
  totalTasks: 2,
  completedTasks: 1,
  inProgressTasks: 1,
  pendingTasks: 0,
  givenUpTasks: 0,
  dailyStats: [
    {
      date: new Date().toISOString().slice(0, 10),
      completedCount: 1,
      totalCount: 2,
    },
  ],
};

const setupApiMocks = async (page: Page) => {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_USER),
    });
  });

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'fake-jwt-token',
        refreshToken: 'fake-refresh-token',
        user: MOCK_USER,
      }),
    });
  });

  await page.route('**/api/auth/register', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'fake-jwt-token',
        refreshToken: 'fake-refresh-token',
        user: MOCK_USER,
      }),
    });
  });

  await page.route('**/api/tasks**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TASKS),
    });
  });

  await page.route('**/api/projects**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_PROJECTS),
    });
  });

  await page.route('**/api/categories**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CATEGORIES),
    });
  });

  await page.route('**/api/statistics**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_STATS),
    });
  });

  await page.route('**/api/chat**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply: 'Hello from AI assistant!' }),
    });
  });
};

const setupAuthenticatedSession = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'fake-jwt-token');
    localStorage.setItem('refreshToken', 'fake-refresh-token');
    localStorage.setItem(
      'user',
      JSON.stringify({
        _id: 'user-e2e-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
      })
    );
  });
};

test.describe('TodoApp Frontend Architecture E2E', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => {
      throw new Error(`Uncaught page error: ${err.message}`);
    });
    await setupApiMocks(page);
  });

  test('Guest landing flow and protected route redirect', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Accessing protected route as guest redirects to /login
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Public auth pages navigation between login and register', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Navigate to register
    await page.goto('/register');
    await expect(page).toHaveURL('/register');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Authenticated user redirects from root and login to dashboard', async ({ page }) => {
    await setupAuthenticatedSession(page);

    await page.goto('/');
    await expect(page).toHaveURL('/dashboard');

    await page.goto('/login');
    await expect(page).toHaveURL('/dashboard');
  });

  test('Authenticated shell loads dashboard and subpages', async ({ page }) => {
    await setupAuthenticatedSession(page);

    // Dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Todos').first()).toBeVisible();

    // Categories
    await page.goto('/categories');
    await expect(page).toHaveURL('/categories');
    await expect(page.locator('text=Categories').first()).toBeVisible();

    // Calendar
    await page.goto('/calendar');
    await expect(page).toHaveURL('/calendar');
    await expect(page.locator('text=Calendar').first()).toBeVisible();

    // Statistics
    await page.goto('/statistics');
    await expect(page).toHaveURL('/statistics');
    await expect(page.locator('text=Statistics').first()).toBeVisible();

    // Profile
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');
    await expect(page.locator('text=Account').first()).toBeVisible();
  });

  test('404 error page renders on unknown route', async ({ page }) => {
    await page.goto('/unknown-route-that-does-not-exist');
    await expect(page.getByRole('heading', { name: /Trang không tồn tại|404/i })).toBeVisible();
  });
});
