# Question ID: Q-0b78c059cb8da8ca

### Answer

Use an inbox table with a unique message ID. In one transaction insert the inbox record and apply the business update. If already processed, skip the update. Acknowledge only after commit. External side effects need their own idempotency or outbox.
