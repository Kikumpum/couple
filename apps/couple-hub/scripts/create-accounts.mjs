import readline from "node:readline";

// Credentials arrive through stdin, never argv, output, or a saved seed file.
const origin = process.env.APP_URL || "http://127.0.0.1:3010";
const action = process.argv.includes("--verify") ? "login" : "register";
if (process.stdin.isTTY) process.stdin.setRawMode(true);
const reader = readline.createInterface({
  input: process.stdin,
  terminal: false,
});
console.log("Ready for account JSON on stdin.");
for await (const line of reader) {
  try {
    const accounts = JSON.parse(line);
    if (!Array.isArray(accounts) || accounts.length > 10)
      throw new Error("Invalid account list.");
    for (const account of accounts) {
      const response = await fetch(`${origin}/api/auth`, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify({ ...account, action }),
      });
      if (!response.ok)
        throw new Error(
          `Account creation failed (${response.status}). Existing accounts were not changed.`,
        );
      const value = await response.json();
      console.log(
        `${action === "login" ? "Verified login" : "Created account"}: ${value.user.username}`,
      );
      const cookie = response.headers.get("set-cookie")?.split(";")[0];
      if (cookie)
        await fetch(`${origin}/api/auth`, {
          method: "POST",
          headers: {
            Origin: origin,
            "Content-Type": "application/json",
            Cookie: cookie,
          },
          body: JSON.stringify({ action: "logout" }),
        });
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
  reader.close();
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  break;
}
