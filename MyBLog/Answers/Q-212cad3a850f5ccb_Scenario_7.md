# Question ID: Q-212cad3a850f5ccb

### Answer

Write the business update and outbox record in one database transaction. A background worker publishes pending records and marks them sent after broker confirmation. A crash can cause duplicate publication, so consumers must be idempotent.
