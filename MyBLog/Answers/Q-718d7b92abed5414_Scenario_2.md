# Question ID: Q-718d7b92abed5414

### Real-world scenario

An API takes 8 seconds instead of 500 milliseconds. It calls SQL Server and a payment provider.

### Step-by-step explanation

1. Add a correlation ID and timing spans around each dependency.

2. If SQL dominates, check execution plans, blocking and connection pool waits. If the provider dominates, inspect its latency, timeout rates and retries.

3. Set a total deadline, dependency timeouts and cancellation. Retry payments only with stable idempotency keys.

4. Reconcile uncertain payment outcomes before attempting another charge.

### Execution flow

```text
Illustrative trace: API 8.2s → SQL 0.2s + payment 7.8s + other 0.2s
```

### Common mistakes and best practices

Do not guess which dependency is slow or log payment secrets.

### Interview-ready answer

Trace each dependency separately using correlation IDs and timing spans. Inspect SQL execution plans, blocking and connection pools; compare payment API latency and timeout rates. Set bounded timeouts and safe retries, use a circuit breaker for dependency failures, and verify the fix with load tests.
