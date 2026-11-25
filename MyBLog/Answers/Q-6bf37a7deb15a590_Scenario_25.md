# Question ID: Q-6bf37a7deb15a590

### Real-world scenario

A stolen long-lived refresh token could let an attacker obtain new access tokens.

### Step-by-step explanation

1. Prefer server-side token storage with a backend-for-frontend and Secure HttpOnly cookies when practical; add cross-site request forgery protection.

2. For browser-only clients minimize token exposure, use authorization code with Proof Key for Code Exchange and avoid persistent storage where feasible.

3. Use short-lived access tokens, refresh rotation and reuse detection where supported. Validate access tokens at the API.

4. On logout revoke the refresh token/session and clear cookies. Self-contained access tokens may remain valid until expiry unless additional controls exist.

### Execution flow

```text
Browser session → backend → access token → API
```

### Common mistakes and best practices

HttpOnly mitigates direct cookie reads but does not eliminate cross-site scripting or request forgery.

### Interview-ready answer

Prefer a backend-for-frontend with server-side token storage and Secure, HttpOnly, appropriately SameSite cookies when practical. Protect cookie-based endpoints against cross-site request forgery. Browser-only applications should minimize token exposure, avoid persistent storage where possible, use short-lived access tokens and secure refresh rotation. Validate tokens server-side.
