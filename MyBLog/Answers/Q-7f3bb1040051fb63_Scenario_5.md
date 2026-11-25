# Question ID: Q-7f3bb1040051fb63

### Real-world scenario

The payment provider is down for 30 minutes. A user submits a payment during the outage.

### Step-by-step explanation

1. Persist Pending payment and outbox event atomically. Return a reference and pending status.

2. Publish to a durable queue. A worker calls the provider using a stable idempotency key, bounded retries, jitter and a circuit breaker.

3. Persist confirmed outcomes before acknowledging. Reconcile ambiguous provider results before retrying.

4. After retry limits, route to a dead-letter queue or durable exception workflow and alert operators.

### Execution flow

```text
API → DB [Pending + Outbox] → Queue → Worker → Provider
```

### Common mistakes and best practices

Never acknowledge before durable completion or claim success before confirmation.

### Interview-ready answer

Persist a pending payment and outbox event atomically. A durable queue and worker process the payment using a stable idempotency key. Apply bounded retries with backoff and jitter, circuit breaking and a dead-letter queue. Acknowledge only after durable processing; reconcile uncertain outcomes with the provider. Never report payment success until confirmed.
