# Whiteboard Websocket Server

This project is a WebSocket server designed for real-time interactions with the Whiteboard object plugin for ILIAS,developed by SURLABS with funding from the University of Freiburg.
This code is freely distributed under the terms of the GNU General Public License version 3 (GPL-3.0),
a copy of which is available at https://www.gnu.org/licenses/gpl-3.0.en.html. This license allows for the free use,
modification, and distribution of this software, ensuring it remains open-source and accessible to the community.

DISCLAIMER: The developers, contributors, and funding entities associated with this Project assume no responsibility for any damages or losses incurred from the use of this software. Users are encouraged to review the license agreements and comply with the terms and conditions set forth.

Community involvement is welcome. To report bugs, suggest improvements, or participate in discussions, please visit the Mantis system and search for ILIAS Plugins under the "Whiteboard" category at https://mantis.ilias.de.

This software has been built using Node.js, Express, WebSocket, Yjs, and y-leveldb.

## Current Architecture

The server entry point is `index.js`. Runtime code is split into small modules under `src/`:

- `config.js`: environment-driven configuration.
- `persistence.js`: LevelDB persistence in `whiteboard-data` by default.
- `documents.js`: in-memory Yjs document registry and shared document lifecycle.
- `websocket.js`: Yjs websocket sync and awareness protocol handling.
- `clone-room.js`: `/clone-room` board cloning logic.

`utils.js` remains as a compatibility wrapper for existing imports.

## Synchronization Compatibility

The websocket protocol remains compatible with `y-websocket` clients:

- Message `0` is Yjs sync.
- Message `1` is Yjs awareness.
- The websocket URL path is still used as the Yjs document name, so a client connecting to `/wb-room-0` opens document `wb-room-0`.
- Whiteboard records are still stored in the Yjs array named `tl_${roomId}`.
- The transient `users` array is cleared when a persisted document is loaded, so stale connected-user state is not restored after server restart.
- Persistence still uses `y-leveldb` and the same `whiteboard-data` directory, preserving existing boards.

The server waits for persisted LevelDB state before sending the initial sync step. This prevents existing boards from briefly loading as empty documents on first connection after a restart.

## Configuration

The following environment variables are supported:

- `PORT`: HTTPS/WSS port by default. Default: `5123`.
- `SERVER_PROTOCOL`: `http` or `https`. Default: `https`.
- `TLS_KEY_PATH`: private key path when `SERVER_PROTOCOL=https`. Default: `./cert/privkey.pem`.
- `TLS_CERT_PATH`: certificate/fullchain path when `SERVER_PROTOCOL=https`. Default: `./cert/fullchain.pem`.
- `MAX_CLIENTS_PER_ROOM`: max connected users per room. Default: `30`.
- `PING_INTERVAL_MS`: websocket heartbeat interval. Default: `30000`.
- `GC`: set to `false` or `0` to disable Yjs garbage collection. Default: enabled.
- `YPERSISTENCE`: persistence directory. Default: `./whiteboard-data`.
- `WHITEBOARD_AUTH_SECRET`: shared HMAC secret used to validate temporary access tokens. Leave empty to keep the legacy unsigned mode. Set at least 32 random characters to enable token validation.

## Access Tokens

Token validation is disabled by default. It is enabled only when `WHITEBOARD_AUTH_SECRET` is set.

When token validation is enabled, the websocket server rejects connections that do not include a valid signed token. The ILIAS plugin must generate this token only after it has checked that the current user may access the whiteboard.

When the same secret is configured in the ILIAS plugin, the client must render the token in the host page:

```html
<div id="whiteboardtoken" class="hidden">TOKEN_VALUE</div>
```

The websocket client sends that token as a `token` query parameter. The token format is:

```text
base64url(json_payload).base64url(hmac_sha256(base64url(json_payload), WHITEBOARD_AUTH_SECRET))
```

Required payload fields:

```json
{
  "roomId": "5196251",
  "username": "Display Name",
  "permissions": {
    "write": true,
    "admin": false,
    "importExport": false
  },
  "exp": 1767225600
}
```

`exp` is a Unix timestamp in seconds. Keep token lifetimes short, for example 5 to 15 minutes. When `WHITEBOARD_AUTH_SECRET` is set, the server rejects missing tokens, invalid signatures, expired tokens, and tokens created for a different room.

PHP example for the ILIAS plugin:

```php
$payload = [
    'roomId' => (string) $roomId,
    'username' => $userDisplayName,
    'permissions' => [
        'write' => $canWrite,
        'admin' => $isAdmin,
        'importExport' => $canImportExport,
    ],
    'exp' => time() + 600,
];

$base64Url = static function (string $value): string {
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
};

$encodedPayload = $base64Url(json_encode($payload, JSON_UNESCAPED_SLASHES));
$signature = $base64Url(hash_hmac('sha256', $encodedPayload, $whiteboardAuthSecret, true));
$token = $encodedPayload . '.' . $signature;
```

The old `role`, `username`, and `hasImportExportPermission` DOM values are not authorization sources. The server trusts only the signed token. Read-only tokens may connect and receive updates, but Yjs document updates sent by those clients are rejected.

If `WHITEBOARD_AUTH_SECRET` is empty, the server keeps the previous behavior and accepts unsigned websocket connections. In that mode, the ILIAS plugin should not render `whiteboardtoken` and no additional authorization is enforced by the websocket server.

## Prerequisites

Before you begin, ensure you have installed Node.js and npm on your machine. The default startup mode is `SERVER_PROTOCOL=https`, so SSL certificates must be available unless you explicitly run with `SERVER_PROTOCOL=http`.

## Installation

To set up the project on your local machine, follow these steps:

1. Clone the repository to a directory on the server where the connection will be hosted.
2. Navigate to the project directory in your terminal.
3. Run `npm install` to install the required dependencies.
4. Copy `fullchain.pem` and `privkey.pem` certificates to the `/cert` folder, or configure `TLS_CERT_PATH` and `TLS_KEY_PATH`. This preserves the default HTTPS/WSS behavior used by existing installations.

## Starting the Server

To start the server, follow these steps:

1. Within the project directory of the websocket server project, run `npm start`.
2. The server will start, and you should see a message indicating that the server is running on a specific port (default is 5123).

The first time you run the server, a directory called "whiteboard-data" will be created. In this folder the persistence data will be stored.

You can edit the port by setting the `PORT` environment variable before starting the server. The server uses HTTPS/WSS by default; set `SERVER_PROTOCOL=http` only for local HTTP testing.

For example:

```sh
SERVER_PROTOCOL=http PORT=5123 npm start
```

**We recommend deploying the server through an individual Linux screen to keep the process active in the background.**
For example:

> screen -S whiteboard

And then, perform steps 1 and 2 to start the server.

You can then use to return to the session where the server was started:

> screen -r whiteboard

## Accessing the Server

The path to your server that you must configure in the Whiteboard plugin will be your domain next to the port and you must configure it in this format:

> yourdomain.com:5123

With the default HTTPS mode, clients should connect using `wss://yourdomain.com:5123`.

## Validation Notes

After server changes, validate at least these flows:

- Start the websocket server with an existing `whiteboard-data` directory and open an existing board.
- Create a new board, draw/edit content, reload the page, and confirm content persists.
- Open the same board in two clients and confirm edits and cursor/presence sync.
- Call `POST /clone-room` with `from` and `to` values and confirm the cloned board opens under the new room id.
