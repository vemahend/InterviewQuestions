# Question ID: Q-0b78c059cb8da8ca

### Real-world scenario

A consumer commits an update but crashes before acknowledging the message.

### Step-by-step explanation

1. Assign a stable message ID at the producer. Create an inbox table with a unique consumer/message ID constraint.

2. Insert the inbox record and apply the business update in one local transaction. Skip already processed IDs.

3. Acknowledge after commit. Roll back on failure and retry or dead-letter poison messages.

4. Use provider idempotency or an outbox for external side effects.

### Execution flow

```text
Queue → DB [Inbox + business update] → Commit → ACK
```

### Common mistakes and best practices

An in-memory HashSet loses history on restart; check-then-insert without uniqueness races.

### Interview-ready answer

Use an inbox table with a unique message ID. In one transaction insert the inbox record and apply the business update. If already processed, skip the update. Acknowledge only after commit. External side effects need their own idempotency or outbox.
