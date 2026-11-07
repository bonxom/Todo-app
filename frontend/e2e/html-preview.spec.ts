import { test, expect, type Page } from "@playwright/test";
import { dashboardFixture } from "./dashboard.fixture";

test.use({ reducedMotion: "reduce" });

const dashboard = `<!doctype html><html><head><style>
body{font-family:system-ui;margin:0;padding:24px;background:#edf4f8;color:#183b52}
h1{font-size:28px}button{background:#466d8b;color:white;padding:12px;border:0;border-radius:8px}
</style></head><body><h1>Weekly dashboard</h1><svg width="40" height="10"><rect width="40" height="10" fill="teal"/></svg>
<p>Completed tasks: <output id="count">6</output></p><button onclick="document.querySelector('#count').textContent++">Complete task</button>
</body></html>`;
async function openHtml(page: Page, html: string) {
  await dashboardFixture(page, true);
  await page.route("**/api/ai/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/capabilities"))
      return route.fulfill({ json: { taskProposals: true } });
    if (path.endsWith("/conversations"))
      return route.fulfill({ json: { data: [] } });
    return route.fulfill({
      json: {
        data: {
          conversationId: "html-preview-history",
          mode: "auto",
          before: null,
          pending: [],
          messages: [
            {
              id: "html-msg",
              sender: "bot",
              text: "```html\n" + html + "\n```",
              timestamp: "2026-11-07T12:00:00Z",
            },
          ],
        },
      },
    });
  });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open assistant" }).click();
}
const content = (page: Page) =>
  page
    .frameLocator('iframe[title="HTML preview"]')
    .frameLocator('iframe[title="HTML content"]');

test("renders historical HTML, runs local JS, expands and retains exact source on mobile", async ({
  page,
}) => {
  await openHtml(page, dashboard);
  await expect(
    content(page).getByRole("heading", { name: "Weekly dashboard" }),
  ).toBeVisible();
  await content(page).getByRole("button", { name: "Complete task" }).click();
  await expect(content(page).locator("output")).toHaveText("7");
  await expect(content(page).locator("body")).toHaveCSS(
    "background-color",
    "rgb(237, 244, 248)",
  );
  await page.getByRole("button", { name: "Expand HTML preview" }).click();
  await expect(
    page.getByRole("dialog", { name: "HTML preview" }),
  ).toBeVisible();
  await expect(content(page).getByRole("heading")).toBeVisible();
  await page.getByRole("button", { name: "Close HTML preview" }).click();
  await expect(
    page.getByRole("button", { name: "Expand HTML preview" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Expand HTML preview" }).click();
  await content(page).getByRole("button", { name: "Complete task" }).focus();
  // Keyboard events inside an opaque child do not bubble to the host.
  // The always-visible host close control is the modal's keyboard exit.
  await page.getByRole("button", { name: "Close HTML preview" }).focus();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "HTML preview" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Expand HTML preview" }),
  ).toBeFocused();
  await page.getByRole("tab", { name: "Code", exact: true }).click();
  await expect(page.locator("pre code")).toHaveText(dashboard);
  await expect(page.getByTitle("HTML preview")).toHaveCount(0);
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(content(page).getByRole("heading")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect
    .poll(async () => {
      const box = await page.getByTitle("HTML preview").boundingBox();
      return !!box && box.x >= 0 && box.x + box.width <= 375;
    })
    .toBe(true);
  await page.screenshot({
    path: test.info().outputPath("html-mobile.png"),
    animations: "disabled",
  });
  await page.reload();
  await page.getByRole("button", { name: "Open assistant" }).click();
  await expect(content(page).locator("output")).toHaveText("6");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: test.info().outputPath("html-desktop.png"),
    animations: "disabled",
  });
});

test("isolates storage and DOM and blocks resource requests, forms, popups and self-navigation", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.route("**/html-preview-probe**", (route) => {
    requests.push(route.request().url());
    return route.fulfill({ body: "blocked probe" });
  });
  const probe = "http://127.0.0.1:5000/html-preview-probe";
  await openHtml(
    page,
    `<meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline'">
<h1>Isolation probe</h1><output id="result"></output><script>
let result=[];
for(const [name,check] of [['storage',()=>localStorage.getItem('token')],['parent',()=>parent.document.body],['top',()=>top.document.body]]) {
try {check();result.push(name+':allowed')}catch{result.push(name+':blocked')}
}
fetch('${probe}?fetch').catch(()=>{});
const s=document.createElement('script');s.src='${probe}?script';document.body.append(s);
const i=new Image();i.src='${probe}?image';document.body.append(i);
const css=document.createElement('link');css.rel='stylesheet';css.href='${probe}?css';document.head.append(css);
const nested=document.createElement('iframe');nested.src='${probe}?nested';document.body.append(nested);
document.querySelector('#result').textContent=result.join(',');
</script><form action="${probe}?form"><button>Submit probe</button></form>
<button onclick="window.open('${probe}?popup')">Popup probe</button>
<button onclick="parent.location='${probe}?parent'">Parent probe</button>
<button onclick="top.location='${probe}?top'">Top probe</button>
<button onclick="location.href='${probe}?self'">Navigate probe</button>`,
  );
  await expect(content(page).locator("#result")).toHaveText(
    "storage:blocked,parent:blocked,top:blocked",
  );
  await content(page).getByRole("button", { name: "Submit probe" }).click();
  await content(page).getByRole("button", { name: "Popup probe" }).click();
  await content(page).getByRole("button", { name: "Top probe" }).click();
  await content(page).getByRole("button", { name: "Parent probe" }).click();
  await content(page).getByRole("button", { name: "Navigate probe" }).click();
  await page.waitForTimeout(300);
  expect(requests).toEqual([]);
  expect(page.context().pages()).toHaveLength(1);
  expect(new URL(page.url()).pathname).toBe("/dashboard");
});
