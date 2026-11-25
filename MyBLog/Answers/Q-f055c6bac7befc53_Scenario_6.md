# Question ID: Q-f055c6bac7befc53

### Answer

Use a stable idempotency key per logical payment, enforced by a unique database constraint. Store request fingerprint and outcome, reject conflicting reuse, and return the existing result on retry. Pass the same key to the payment provider and reconcile uncertain outcomes.
