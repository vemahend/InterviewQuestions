# Question ID: Q-a682057e3fae4032

### Answer

Sequential awaits start each operation after the previous one completes. Task.WhenAll waits for all supplied tasks to complete, allowing independently started asynchronous operations to overlap.

```csharp
// Sequential: approximately 9 seconds (2 + 3 + 4)
var customer = await GetCustomerAsync();
var orders = await GetOrdersAsync();
var payments = await GetPaymentsAsync();
```

```csharp
// Concurrent: approximately 4 seconds
var customerTask = GetCustomerAsync();
var ordersTask = GetOrdersAsync();
var paymentsTask = GetPaymentsAsync();

await Task.WhenAll(customerTask, ordersTask, paymentsTask);

var customer = await customerTask;
var orders = await ordersTask;
var payments = await paymentsTask;
```

Use sequential awaits when operations depend on one another. Use Task.WhenAll for independent operations, such as calling multiple external services to populate a dashboard.

**Senior-level considerations:** Task.WhenAll does not create threads or start tasks itself. It waits for all supplied tasks, including when one fails. Avoid concurrent operations on the same Entity Framework Core DbContext instance. Consider resource limits and rate limiting.
