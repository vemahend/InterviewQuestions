# Question ID: Q-212cad3a850f5ccb

### Real-world scenario

An order saves successfully but the broker is unavailable.

### Step-by-step explanation

1. Insert the order and outbox row in the same local transaction. Both commit or neither does.

2. A background publisher reads pending rows, publishes stable message IDs and marks rows sent after broker confirmation.

3. A crash between publish and marking sent can cause duplicate publication; consumers must be idempotent.

4. Monitor backlog age and failures, safely claim batches across workers and archive published rows.

### Execution flow

```text
DB [Order + Outbox] → Commit → Publisher → Broker
```

### Practical example

```csharp
db.Orders.Add(order);
db.OutboxMessages.Add(outboxMessage);
await db.SaveChangesAsync(ct); // one local transaction
```

### Common mistakes and best practices

Outbox gives reliable eventual publication, not exactly-once delivery.

### Interview-ready answer

Write the business update and outbox record in one database transaction. A background worker publishes pending records and marks them sent after broker confirmation. A crash can cause duplicate publication, so consumers must be idempotent.
