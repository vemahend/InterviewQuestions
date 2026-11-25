# Question ID: Q-6bf37a7deb15a590

### Answer

Prefer a backend-for-frontend with server-side token storage and Secure, HttpOnly, appropriately SameSite cookies when practical. Protect cookie-based endpoints against cross-site request forgery. Browser-only applications should minimize token exposure, avoid persistent storage where possible, use short-lived access tokens and secure refresh rotation. Validate tokens server-side.
