self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function handlePushEvent(event) {
  let payload = null;
  if (event && event.data && typeof event.data.json === "function") {
    try {
      payload = event.data.json();
    } catch {
      payload = null;
    }
  }

  const kind =
    payload && typeof payload.kind === "string" ? payload.kind : "agent_reply";
  const title =
    payload && typeof payload.title === "string" && payload.title
      ? payload.title
      : "Orbit";
  const body = payload && typeof payload.body === "string" ? payload.body : "";
  const url =
    payload && typeof payload.url === "string" && payload.url.startsWith("/")
      ? payload.url
      : "/v2/dashboard";
  const tag =
    payload && typeof payload.tag === "string" && payload.tag
      ? payload.tag
      : "orbit-push";

  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  let hasFocusedClient = false;
  for (const client of clients) {
    if (client && client.focused === true) {
      hasFocusedClient = true;
    }
    if (client && typeof client.postMessage === "function") {
      client.postMessage({
        type: "ORBIT_PUSH_RECEIVED",
        kind,
      });
    }
  }

  if (hasFocusedClient) {
    return;
  }

  await self.registration.showNotification(title, {
    body,
    tag,
    icon: "/icons/orbit-192.png",
    badge: "/icons/orbit-192.png",
    data: { url, kind },
  });
}

async function handleNotificationClick(event) {
  event.notification.close();

  const rawUrl =
    event &&
    event.notification &&
    event.notification.data &&
    event.notification.data.url;
  const targetPath =
    typeof rawUrl === "string" && rawUrl.startsWith("/")
      ? rawUrl
      : "/v2/dashboard";
  const targetUrl = new URL(targetPath, self.location.origin).href;

  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  const existingClient =
    clients.find(
      (client) =>
        client &&
        typeof client.url === "string" &&
        client.url.startsWith(self.location.origin),
    ) || clients[0];

  if (existingClient) {
    if (
      typeof existingClient.navigate === "function" &&
      existingClient.url !== targetUrl
    ) {
      await existingClient.navigate(targetUrl);
    }
    if (typeof existingClient.focus === "function") {
      await existingClient.focus();
    }
    return;
  }

  await self.clients.openWindow(targetUrl);
}

self.addEventListener("push", (event) => {
  event.waitUntil(handlePushEvent(event));
});

self.addEventListener("notificationclick", (event) => {
  event.waitUntil(handleNotificationClick(event));
});
