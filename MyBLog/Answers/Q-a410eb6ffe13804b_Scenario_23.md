# Question ID: Q-a410eb6ffe13804b

### Real-world scenario

A React application needs secure login and calls an ASP.NET Core API using Amazon Cognito.

### Step-by-step explanation

1. Configure a user pool, app client, callback URLs and scopes. Use OpenID Connect authorization code flow with Proof Key for Code Exchange.

2. Prefer a backend-for-frontend when practical: exchange tokens server-side, use Secure HttpOnly session cookies and protect against cross-site request forgery.

3. Validate access-token signature, issuer, expiry, token use, client identifier or audience as appropriate, and scopes in the API.

4. Implement refresh, logout, audit logging, rate limiting and key rotation. Test invalid tokens and missing scopes.

### Execution flow

```text
React → Cognito → authorization code → token exchange → API
```

### Common mistakes and best practices

Do not use ID tokens as API access tokens or embed a client secret in a public browser client.

### Interview-ready answer

Use OpenID Connect authorization code flow with Proof Key for Code Exchange. Prefer a backend-for-frontend with secure HttpOnly cookies where appropriate; protect against cross-site request forgery. Validate access-token signature, issuer, audience or client identifier as appropriate, expiry and scopes in the API. Use short-lived access tokens, secure refresh-token handling, rotation where supported, rate limiting and audit logging.
