const http = require('http');

const PORT = 3333;

const HTML = `<!DOCTYPE html>
<html>
  <head>
    <title>Cypress Bug Repro</title>
    <!-- Large asset loaded on page visit -->
    <script src="/assets/large-vendor.js"></script>
  </head>
  <body>
    <h1>Cypress Bug Repro</h1>
  </body>
</html>`;

const server = http.createServer((req, res) => {
  console.log(`[server] ${req.httpVersion} ${req.method} ${req.url}`);

  if (req.url === '/assets/large-vendor.js') {
    // Normal small placeholder response from server (cy.intercept will stub with >100MB body)
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end('console.log("vendor loaded");');
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});
