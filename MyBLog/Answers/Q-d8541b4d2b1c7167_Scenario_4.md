# Question ID: Q-d8541b4d2b1c7167

### Real-world scenario

An error happens in production but cannot be reproduced locally.

### Step-by-step explanation

1. Capture the request ID, operation, time and error. Search structured logs and distributed traces.

2. Compare failed and successful requests: configuration, data, versions, permissions and concurrency.

3. Add targeted diagnostics, reproduce with sanitized data or controlled fault injection in staging.

4. Write a regression test, deploy gradually and verify metrics return to normal.

### Execution flow

```text
Report → logs/traces → hypothesis → reproduction → fix → monitoring
```

### Common mistakes and best practices

Do not change production blindly or expose sensitive data in diagnostics.

### Interview-ready answer

Collect structured logs, correlation IDs, traces, metrics and exact reproduction conditions. Compare production configuration, data, versions and concurrency with local environments. Reproduce safely using sanitized data, add targeted diagnostics and regression tests, and validate the fix in staging before rollout.
