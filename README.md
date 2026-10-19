# alexa-mcp

> An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that lets Claude — and any other MCP-compatible LLM — control Amazon Alexa devices: speak announcements, send text commands, manage smart-home groups, run routines, and more.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

Built on top of [`alexa-remote2`](https://github.com/Apollon77/alexa-remote) (the actively maintained client for Amazon's internal Alexa API).

---

## Features

19 tools exposed over MCP, grouped by domain:

**Devices**
- `alexa_list_devices` — list every Echo in the account with serial, type, online status
- `alexa_set_volume` / `alexa_get_volumes` — read or change volume per device
- `alexa_do_not_disturb` — toggle DND on a device

**Voice & messaging**
- `alexa_announce` — push a spoken announcement to a specific Echo
- `alexa_text_command` — send a text command as if you spoke it ("turn on the kitchen lights")
- `alexa_speak_ssml` — make Alexa speak SSML for fine-grained voice control

**Smart home**
- `alexa_list_smarthome_devices` — list all paired smart-home devices (lights, sensors, switches…)
- `alexa_query_device` — read the current state of one or more devices
- `alexa_list_groups` / `alexa_create_group` / `alexa_update_group` / `alexa_delete_group` — manage rooms / groups

**Routines**
- `alexa_list_routines` — list every routine in the account
- `alexa_execute_routine` — run a routine by passing its automation definition
- `alexa_delete_routine` — permanently delete one routine; needs its `automationId` and exact name, and refuses if they don't match. Returns the deleted definition so it can be recreated in the app

**Lists**
- `alexa_list_lists` — list shopping / to-do / custom lists
- `alexa_get_list_items` — read items from a list
- `alexa_add_list_item` — append an item to a list

---

## Requirements

- **Node.js ≥ 18**
- An Amazon account with at least one registered Alexa/Echo device
- An MCP-compatible client ([Claude Desktop](https://claude.ai/download), Claude Code, etc.)

---

## Installation

```bash
git clone https://github.com/<your-user>/alexa-mcp.git
cd alexa-mcp
npm install
```

---

## Authentication

Amazon's Alexa API is private and requires a real browser-based login (no API keys). The MCP ships with an interactive auth helper:

```bash
npm run auth
```

This will:

1. Start a local HTTP proxy on `http://localhost:3457`.
2. Print a URL you open in your browser.
3. You log in with your normal Amazon credentials (handles 2FA / OTP correctly because it's the actual Amazon page, just proxied).
4. The proxy intercepts the resulting session cookies and saves them to `.auth-data/auth.json` (mode `0600`, never committed — see [Security](#security)).

You only need to run this once. From then on, `alexa-remote2` refreshes tokens automatically. If you ever see `Authentication failed`, just re-run `npm run auth`.

> **Region note:** the helper defaults to `amazon.com` and Spanish locale (`es-MX`). If your account lives in another marketplace (`amazon.de`, `amazon.co.uk`, `amazon.com.mx`, etc.) edit `src/auth.js` accordingly. PRs welcome to make this configurable via env vars.

### Multiple Alexa accounts (multi-instance)

A single clone of this repo can serve **multiple Alexa accounts** by setting the `ALEXA_MCP_AUTH_DIR` env var to point at a per-instance directory:

```bash
# Authenticate the personal account
ALEXA_MCP_AUTH_DIR=~/.alexa-mcp/personal npm run auth

# Authenticate a second (e.g. work) account
ALEXA_MCP_AUTH_DIR=~/.alexa-mcp/work npm run auth
```

Each instance keeps its own `auth.json` in its own directory, so they never collide. The default (when `ALEXA_MCP_AUTH_DIR` is unset) remains the project-local `.auth-data/` for the simple single-account case. See [Usage with Claude Desktop](#usage-with-claude-desktop) below for how to register two MCP servers from the same code.

---

## Usage with Claude Desktop

Add the server to your Claude Desktop config:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "alexa": {
      "command": "node",
      "args": ["/absolute/path/to/alexa-mcp/src/index.js"]
    }
  }
}
```

Restart Claude Desktop. The Alexa tools should appear in the tool picker.

## Usage with Claude Code

```bash
claude mcp add alexa -- node /absolute/path/to/alexa-mcp/src/index.js
```

## Usage with other MCP clients

Any client that speaks MCP over stdio works. Point it at `node /absolute/path/to/alexa-mcp/src/index.js`.

---

## Examples

Once configured, you can ask Claude things like:

- *"List my Echo devices and tell me which ones are online"*
- *"Tell the kitchen Echo to remind everyone dinner is ready"*
- *"Lower the volume of the living room speaker to 30%"*
- *"Run the 'Good night' routine"*
- *"Add milk and eggs to my shopping list"*
- *"Which lights are currently on in the office?"*

---

## Security

- **`.auth-data/` is git-ignored** and contains your session cookies. Treat it like a password — anyone with that file can control your Alexa account.
- The auth file is written with mode `0600` (owner-read-only).
- This server runs **locally** and talks to Amazon directly. No third-party services are involved.
- The MCP transport is **stdio only**. The server never opens a network port; it only talks to its parent process (Claude Desktop / Claude Code) via standard input/output.
- The HTTP-related transitive dependencies of `@modelcontextprotocol/sdk` (`hono`, `express`, etc.) are present in `node_modules` but are **never executed** by this server.

### Known upstream advisory

`alexa-cookie2` (a transitive dep of `alexa-remote2`) currently pins an old version of `cookie` (`<0.7.0`) flagged as **low** severity. The fix is not available without downgrading `alexa-remote2` by 7 majors, which would break the integration. The vulnerability only affects parsing of malformed cookie names and does not impact normal use. Track upstream: [Apollon77/alexa-cookie2](https://github.com/Apollon77/alexa-cookie2).

---

## Troubleshooting

| Symptom | What to try |
|---|---|
| `Authentication failed` / commands silently fail | Re-run `npm run auth` |
| Commands "succeed" but the device does nothing | Verify the device is online in the official Alexa app |
| MCP doesn't appear in Claude | Confirm the path in your client config is absolute, then restart the client |
| Wrong language / region | Edit `amazonPage` and `acceptLanguage` in `src/auth.js`, then re-auth |
| `EADDRINUSE` on port 3457 during auth | Kill whatever is using port 3457, or change `PROXY_PORT` in `src/auth.js` |
| Asked to log in again soon after authenticating | Upgrade to v1.1.1 or later. Earlier versions rotated the Amazon token on every start and never saved the new one. The previous registration is kept in `auth.json.prev` |

---

## Project structure

```
alexa-mcp/
├── src/
│   ├── index.js         # MCP server entry point — registers all 19 tools
│   ├── alexa-client.js  # Thin wrapper around alexa-remote2
│   ├── routines.js      # ID + name safety check for alexa_delete_routine
│   └── auth.js          # Interactive auth flow (run once)
├── .auth-data/          # OAuth tokens (created at first auth, git-ignored)
├── package.json
├── LICENSE
└── README.md
```

---

## Contributing

Issues and PRs welcome. Some ideas worth tackling:

- Make region / locale configurable via env vars instead of editing `src/auth.js`
- Expose more `alexa-remote2` capabilities (timers, alarms, music providers)
- Add an automated test suite (currently none — verification is manual)
- Docker image for easier deployment

---

## Acknowledgments

- [Apollon77](https://github.com/Apollon77) for maintaining [`alexa-remote2`](https://github.com/Apollon77/alexa-remote), which does the actual heavy lifting of talking to Amazon.
- The [Model Context Protocol](https://modelcontextprotocol.io) team at Anthropic.

---

## License

[MIT](./LICENSE) © Renato Ascencio
