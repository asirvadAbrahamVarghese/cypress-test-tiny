# Cypress 16 — Cannot Rerun Tests in Open Mode in Chrome Due to CDP WebSocket Disconnect

**Minimal reproduction** for Cypress Issue [#35025](https://github.com/cypress-io/cypress/issues/35025).

## Root Cause Explained

In **Cypress 16**, Cypress enabled the native browser network layer by default on Chromium browsers via the Chrome DevTools Protocol (`CDP`) `Fetch` domain (`Fetch.enable`).

### The Bug Mechanism
1. When fulfilling or modifying a request over the CDP `Fetch` domain, Cypress sends the response to Chromium via the CDP command `Fetch.fulfillRequest`.
2. `Fetch.fulfillRequest` accepts the response body as a **Base64-encoded string** inside the WebSocket message sent to Chromium's DevTools WebSocket server.
3. Chromium's DevTools HTTP/WebSocket server (`net/server/http_connection.cc`) has a hardcoded maximum buffer limit:
   ```text
   max_buffer_size = 104857600 bytes (100 MB)
   ```
4. If an asset is ~75MB+ uncompressed (which expands to **>100MB** when Base64-encoded), sending the payload via `Fetch.fulfillRequest` triggers a buffer overflow inside Chromium's network layer:
   ```text
   chrome stderr: [ERROR:net/server/http_connection.cc:44] Too large read data is pending: capacity=104857600, max_buffer_size=104857600, read=104857600
   cypress:server:browsers:cdp-connection terminal disconnect for target (reconnection disabled)
   ```
5. Chromium **abruptly terminates the CDP WebSocket connection**.

---

## Comparison Matrix

| Scenario | Result | Reason |
|---|---|---|
| **Chrome (Cypress 16 default native path in Open/Run mode)** | ❌ **Freeze / Cannot Rerun** | Exceeds Chrome CDP WebSocket 100MB buffer limit (`max_buffer_size=104857600`). |
| **Chrome with `forceHttp1: true`** | ✅ **Passes / Can Rerun** | Bypasses CDP Fetch domain and uses Cypress Node HTTP proxy streaming. |
| **Electron** | ✅ **Passes / Can Rerun** | Uses legacy proxy layer; does not fulfill large payloads over CDP WebSocket. |

---

## How the reproduction works

- [`server.js`](server.js:1) is a zero-dependency Node HTTP server.
- [`cypress/e2e/spec.cy.js`](cypress/e2e/spec.cy.js:1) contains the minimal test case that stubs an asset with ~80MB body (producing ~107MB Base64 payload in `Fetch.fulfillRequest`).

## Steps to reproduce

### 1. Install dependencies

```bash
npm install
```

### 2. Start the reproduction server

```bash
npm run server
# → [server] Listening on http://localhost:3333
```

### 3. Reproduce in Cypress Open Mode (Interactive)

```bash
npm run cypress:open
```
1. Select **E2E Testing** -> **Chrome**.
2. Run [`cypress/e2e/spec.cy.js`](cypress/e2e/spec.cy.js:1).
3. Try clicking **Rerun** (or modifying the file) — the runner hangs / freezes and cannot rerun tests because the CDP connection was severed.

Alternatively, via CLI:
```bash
npm run cypress:run:chrome
# The test will hang indefinitely after cy.visit()
```

### 4. Run with Electron (passes)

```bash
npm run cypress:run
# Test passes on the legacy proxy path
```

### 5. Workaround: Enable `forceHttp1: true`

Add `forceHttp1: true` in `cypress.config.js`:

```javascript
// cypress.config.js
module.exports ={
  e2e: {
    forceHttp1: true,
   // ...
  },
}
```

Then run with Chrome again:
```bash
npm run cypress:run:chrome
# Passes
```
