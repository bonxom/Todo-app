import { test, expect } from "@playwright/test";
import { dashboardFixture } from "./dashboard.fixture";

test("private attachment upload, image preview, history reload and download", async ({
  page,
}) => {
  await dashboardFixture(page);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  const id = "74d41021-c164-4250-b262-3d93dba7ebcf";
  const file = {
    id: "ef868a22-751b-47ee-9179-2f725b3c1588",
    name: "photo.png",
    mimeType: "image/png",
    size: png.length,
  };
  let sent = false;
  let uploadCount = 0;
  let downloadCount = 0;
  await page.route("**/api/ai/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    expect(route.request().headers().authorization).toBe(
      "Bearer dashboard-test-token",
    );
    if (path.endsWith(`/attachments/${file.id}`)) {
      downloadCount++;
      return route.fulfill({
        contentType: "image/png",
        body: png,
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (path.endsWith("/attachments") && method === "POST") {
      uploadCount++;
      expect(route.request().headers()["content-type"]).toContain(
        "multipart/form-data; boundary=",
      );
      return route.fulfill({ status: 201, json: { data: file } });
    }
    if (path.endsWith("/chat-mcp")) {
      expect(route.request().postDataJSON().attachmentIds).toEqual([file.id]);
      sent = true;
      return route.fulfill({
        json: {
          success: true,
          data: "Saved.",
          status: "completed",
          conversationId: id,
        },
      });
    }
    if (path.endsWith("/conversations") && method === "POST")
      return route.fulfill({ status: 201, json: { conversationId: id } });
    if (path.endsWith("/conversations"))
      return route.fulfill({
        json: {
          data: sent
            ? [
                {
                  id,
                  title: "Keep this photo",
                  updatedAt: new Date().toISOString(),
                },
              ]
            : [],
        },
      });
    return route.fulfill({
      json: {
        data: sent
          ? {
              conversationId: id,
              title: "Keep this photo",
              mode: "auto",
              before: null,
              pending: [],
              messages: [
                {
                  id: "m1",
                  sender: "user",
                  text: "Keep this photo",
                  timestamp: new Date().toISOString(),
                  attachments: [file],
                },
                {
                  id: "m2",
                  sender: "bot",
                  text: "Saved.",
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : null,
      },
    });
  });
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Open assistant" }).click();
  await page
    .getByLabel("Choose images")
    .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: png });
  await expect(
    page.getByRole("button", { name: "Send message" }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Keep this photo");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("img", { name: "photo.png" })).toBeVisible();
  await expect(page.getByRole("img", { name: "photo.png" })).toHaveJSProperty(
    "naturalWidth",
    1,
  );
  expect(uploadCount).toBe(1);
  await page.reload();
  await page.getByRole("button", { name: "Open assistant" }).click();
  await expect(page.getByRole("img", { name: "photo.png" })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download photo.png" }).click();
  expect((await download).suggestedFilename()).toBe("photo.png");
  expect(downloadCount).toBeGreaterThanOrEqual(2);
  await page.screenshot({
    path: "/tmp/todoapp-chat-attachments.png",
    fullPage: true,
  });
});
