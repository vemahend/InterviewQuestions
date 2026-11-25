# Question ID: Q-bb4067580db31fa1

### Real-world scenario

A CustomerService keeps customers in IMemoryCache and a static Dictionary.

### Step-by-step explanation

1. Remove redundant static storage; ordinary Dictionary is unsafe for concurrent writes and can grow without expiration.

2. Validate ID and authorization, then check a scoped cache key before querying.

3. On miss, query asynchronously with projection or AsNoTracking. Cache immutable data with expiration and invalidate after updates.

4. Consider distributed caching across instances and coordinate expensive concurrent misses.

### Execution flow

```text
Request → authorization → cache hit: return / miss: DB → cache → return
```

### Common mistakes and best practices

Avoid caching tracked entities or sharing user-specific data across users.

### Interview-ready answer

Remove redundant static storage; it can grow without bounds and a normal Dictionary is unsafe for concurrent writes. Validate IDs, check the cache before querying, use asynchronous database access and AsNoTracking for read-only data. Cache a suitable projection with expiration and invalidation. Consider distributed caching for multiple instances and avoid caching sensitive data without proper isolation.
