# Question ID: Q-f055c6bac7befc53

### Real-world scenario

A customer clicks Pay twice or retries after a lost response.

### Step-by-step explanation

1. Generate one idempotency key per logical payment, scoped to customer and operation.

2. Enforce uniqueness in the database; store a request fingerprint and status. Reject reuse with different input.

3. Return the existing result or pending status for duplicates. Pass the stable key to the provider.

4. Test simultaneous requests, provider success followed by timeout, and crashes before local status updates.

### Execution flow

```text
Request A (key K) → payment record → provider; Request B (key K) → existing record
```

### Practical example

```sql
CREATE UNIQUE INDEX UX_Payment_Customer_Key ON Payments(CustomerId, IdempotencyKey);
```

### Common mistakes and best practices

Disabling the button alone is insufficient. A database transaction cannot atomically commit an external charge.

### Interview-ready answer

Use a stable idempotency key per logical payment, enforced by a unique database constraint. Store request fingerprint and outcome, reject conflicting reuse, and return the existing result on retry. Pass the same key to the payment provider and reconcile uncertain outcomes.
