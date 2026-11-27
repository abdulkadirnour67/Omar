const { existsSync } = require("node:fs");
const { join } = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const filename = process.env.CONTACT_DATABASE ?? join(__dirname, "messages.sqlite");

if (!existsSync(filename)) {
  console.log("No messages have been saved yet.");
} else {
  const database = new DatabaseSync(filename, { readOnly: true });
  const messages = database.prepare(
    "SELECT name, email, message, created_at FROM messages ORDER BY id DESC",
  ).all();
  console.log(JSON.stringify(messages, null, 2));
  database.close();
}
