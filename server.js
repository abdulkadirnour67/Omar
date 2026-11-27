const { createServer } = require("node:http");
const { createReadStream } = require("node:fs");
const { stat } = require("node:fs/promises");
const { join } = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const port = Number(process.env.PORT ?? 3000);
const database = new DatabaseSync(process.env.CONTACT_DATABASE ?? join(__dirname, "messages.sqlite"));
database.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);
const saveMessage = database.prepare("INSERT INTO messages (name, email, message) VALUES (?, ?, ?)");

const portrait = "profile/WhatsApp Image 2026-11-23 at 11.05.10 PM.jpeg";
const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/script.js", ["script.js", "text/javascript; charset=utf-8"]],
  ["/" + portrait, [portrait, "image/jpeg"]],
]);

function reply(request, response, status, message) {
  const json = request.headers.accept?.includes("application/json");
  response.writeHead(status, {
    "Content-Type": json ? "application/json; charset=utf-8" : "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(json ? JSON.stringify({ message }) : message);
}

async function handleContact(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return reply(request, response, 405, "Method not allowed.");
  }
  if (request.headers["content-type"]?.split(";")[0] !== "application/x-www-form-urlencoded") {
    return reply(request, response, 415, "Unsupported content type.");
  }

  let body = "";
  request.setEncoding("utf8");
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    body += chunk;
    if (Buffer.byteLength(body) > 40_000) {
      response.setHeader("Connection", "close");
      return reply(request, response, 413, "Your message is too long.");
    }
  }

  const fields = new URLSearchParams(body);
  const name = fields.get("name")?.trim();
  const email = fields.get("email")?.trim();
  const message = fields.get("message")?.trim();
  if (!name || name.length > 100 || !email || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) || !message || message.length > 3000) {
    return reply(request, response, 400, "Please enter your name, a valid email address, and a message.");
  }

  saveMessage.run(name, email, message);
  return reply(request, response, 201, "Thank you! Your message has been saved.");
}

const server = createServer(async (request, response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  try {
    const pathname = decodeURIComponent(request.url.split("?")[0]);
    if (pathname === "/api/contact") {
      await handleContact(request, response);
      return;
    }

    const asset = files.get(pathname);
    if (!asset) return reply(request, response, 404, "Page not found.");
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.setHeader("Allow", "GET, HEAD");
      return reply(request, response, 405, "Method not allowed.");
    }

    const [filename, contentType] = asset;
    const path = join(__dirname, filename);
    const { size } = await stat(path);
    response.writeHead(200, { "Content-Type": contentType, "Content-Length": size });
    if (request.method === "HEAD") return response.end();
    const stream = createReadStream(path);
    stream.on("error", (error) => response.destroy(error));
    response.on("close", () => stream.destroy());
    stream.pipe(response);
  } catch (error) {
    const status = error instanceof URIError ? 400 : 500;
    if (status === 500 && !request.aborted) console.error(error);
    if (!response.headersSent && !response.destroyed) {
      reply(request, response, status, "We could not complete your request. Please try again.");
    }
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log("Portfolio: http://127.0.0.1:" + server.address().port);
});
