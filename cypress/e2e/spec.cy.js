/// <reference types="cypress" />
describe('Cypress 16 — CDP Fetch.fulfillRequest buffer overflow on large response payload', () => {
  it('REPRO: Fulfilling >100MB Base64 payload terminates Chrome CDP WebSocket connection', () => {
    // 80MB raw text converts to ~107MB Base64 in CDP Fetch.fulfillRequest.
    // Chrome DevTools Protocol has a hard limit of max_buffer_size = 104857600 (100MB).
    const largeBody = '/* large asset */\n' + 'var x = "' + 'a'.repeat(80 * 1024 * 1024) + '";';
    cy.intercept('GET', '/assets/large-vendor.js', {
      statusCode: 200,
      headers: { 'Content-Type': 'application/javascript' },
      body: largeBody,
    }).as('largeVendor');

    cy.visit('/');
    cy.wait('@largeVendor');
    // will hang indefinitely
    cy.intercept('POST', '/api/data').as('apiData');
    cy.get('h1').should('contain', 'Cypress Bug Repro'); // never executes
  });
});
