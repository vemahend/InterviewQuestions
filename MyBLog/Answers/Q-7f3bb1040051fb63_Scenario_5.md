# Question ID: Q-7f3bb1040051fb63

### Answer

Persist a pending payment and outbox event atomically. A durable queue and worker process the payment using a stable idempotency key. Apply bounded retries with backoff and jitter, circuit breaking and a dead-letter queue. Acknowledge only after durable processing; reconcile uncertain outcomes with the provider. Never report payment success until confirmed.
