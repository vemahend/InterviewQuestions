# Question ID: Q-a410eb6ffe13804b

### Answer

Use OpenID Connect authorization code flow with Proof Key for Code Exchange. Prefer a backend-for-frontend with secure HttpOnly cookies where appropriate; protect against cross-site request forgery. Validate access-token signature, issuer, audience or client identifier as appropriate, expiry and scopes in the API. Use short-lived access tokens, secure refresh-token handling, rotation where supported, rate limiting and audit logging.
