# Question ID: Q-81cfe63c08d12192

### Real-world scenario

A service handles 10,000 requests per minute, about 167 per second on average. Users report timeouts.

### Step-by-step explanation

1. Check request rate, error rate and 95th/99th percentile latency in Amazon CloudWatch. Compare with a healthy period.

2. Trace the request through the Application Load Balancer, application, SQL Server and external services. Check processor usage, instrumented memory metrics, thread pool and connection pool pressure.

3. Inspect SQL execution plans, locks and indexes. Compare recent deployments and dependency latency.

4. Fix the measured bottleneck, load-test and monitor the same metrics.

### Execution flow

```text
Request → Load balancer → API → SQL / external service
```

### Common mistakes and best practices

Scaling blindly does not fix a database lock. Average latency can hide slow requests.

### Interview-ready answer

Check Amazon CloudWatch request latency, error rates, traffic, processor and memory metrics (memory requires suitable instrumentation). Trace requests through the load balancer, application, SQL Server and downstream services. Compare recent deployments and traffic. Inspect execution plans, blocking, indexes and connection pools. Fix the measured bottleneck, load-test and monitor percentile latency.
