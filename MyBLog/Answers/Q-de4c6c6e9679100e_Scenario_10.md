# Question ID: Q-de4c6c6e9679100e

### Real-world scenario

One dependency fails in a distributed application while other services remain healthy.

### Step-by-step explanation

1. Set timeouts and bounded retries with jitter. Use circuit breakers and bulkheads to prevent cascading failures.

2. Persist critical work in durable storage and use outbox/inbox patterns with idempotency.

3. Use health checks, redundancy and controlled recovery; distinguish readiness from liveness.

4. Measure latency, errors and queue backlog. Test dependency outages, duplicate delivery and partial failure.

### Execution flow

```text
Failure → isolate → durable retry → recover → reconcile
```

### Common mistakes and best practices

Do not confuse availability with correctness. Avoid unlimited retries.

### Interview-ready answer

Use timeouts, bounded retries with jitter, circuit breakers, bulkheads, durable messaging, idempotency, health checks and observability. Design for partial failures and test recovery. Use outbox/inbox for reliable event processing.
