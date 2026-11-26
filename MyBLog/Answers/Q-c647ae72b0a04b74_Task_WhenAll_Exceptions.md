<!-- bank-question-id: Q-c647ae72b0a04b74 -->

# How do you handle exceptions with Task.WhenAll?

**Question number:** 47  
**Conversation question ID:** Q-c647ae72b0a04b74  
**Question bank ID:** Q-c647ae72b0a04b74

## 1. Core concept

Use a `try-catch` block around `await Task.WhenAll()`. When multiple tasks fail, awaiting the combined task normally propagates one exception, while its `Exception` property contains all recorded failures as an `AggregateException`.

`Task.WhenAll()` waits until every supplied task reaches a terminal state. It does not automatically cancel other tasks when one fails.

## 2. Basic example

```csharp
try
{
    Task task1 = ProcessPaymentAsync();
    Task task2 = SendEmailAsync();
    Task task3 = UpdateCustomerAsync();

    await Task.WhenAll(task1, task2, task3);
}
catch (Exception ex)
{
    Console.WriteLine(ex.Message);
    throw;
}
```

| Operation | Duration | Status |
|---|---:|---|
| Payment | 2 seconds | Failed |
| Email | 3 seconds | Failed |
| Customer update | 5 seconds | Completed |

The catch block executes after approximately five seconds, not two. Do not assume which exception will be propagated by `await`.

## 3. Capture all exceptions

```csharp
Task task1 = ProcessPaymentAsync();
Task task2 = SendEmailAsync();
Task task3 = UpdateCustomerAsync();

Task allTasks = Task.WhenAll(task1, task2, task3);

try
{
    await allTasks;
}
catch (OperationCanceledException) when (allTasks.IsCanceled)
{
    Console.WriteLine("Operation cancelled.");
    throw;
}
catch (Exception)
{
    if (allTasks.Exception != null)
    {
        foreach (var exception in
                 allTasks.Exception.Flatten().InnerExceptions)
        {
            Console.WriteLine(exception.Message);
        }
    }

    throw;
}
```

Possible logged errors:

```text
Payment service timed out.
Email service unavailable.
```

`AggregateException` contains multiple exceptions. `Flatten()` removes nested aggregate exception containers. `throw;` preserves the original exception's stack trace; it does not rethrow every stored exception.

## 4. Combined task status

| Scenario | Status |
|---|---|
| All tasks succeed | RanToCompletion |
| One or more tasks fail | Faulted |
| At least one is cancelled and none fail | Canceled |
| One fails and another is cancelled | Faulted |

## 5. Selective retries

```csharp
if (task1.IsFaulted)
{
    // Assess whether payment can safely be retried.
}

if (task2.IsFaulted)
{
    // Assess whether email can safely be retried.
}

if (task3.IsCompletedSuccessfully)
{
    // No retry required.
}
```

A retry starts a new operation; an existing completed task cannot be restarted. Retry only transient failures, use exponential backoff with jitter, and use idempotency keys for payments to avoid duplicate charges. Log failures with operation names and correlation identifiers.

The operations above are illustrative. Only run independent operations concurrently; a payment confirmation email should normally depend on successful payment. Also avoid concurrent operations on the same Entity Framework Core database context.

## 6. Strong interview answer

I handle exceptions with `Task.WhenAll()` using a try-catch block. It waits for all tasks to finish, even if one fails. Awaiting it propagates one exception, but the combined task stores all failures in its `Exception` property. I inspect `Exception.Flatten().InnerExceptions` to log all failures and check individual task statuses to selectively retry safe, transient failures. If early cancellation is required, I implement cooperative cancellation using a shared cancellation token.

## 7. Interview practice

```csharp
Task task1 = Task.Run(async () =>
{
    await Task.Delay(2000);
    throw new Exception("Payment failed");
});

Task task2 = Task.Run(async () =>
{
    await Task.Delay(5000);
    Console.WriteLine("Email sent");
});

try
{
    await Task.WhenAll(task1, task2);
}
catch (Exception ex)
{
    Console.WriteLine(ex.Message);
}
```

1. Will the catch block execute after two or five seconds?
2. Will the second task continue after the first fails?
3. What is the output order?
4. How would you cancel the second task when the first fails?

### Answers

1. Approximately five seconds.
2. Yes, `Task.WhenAll()` does not automatically cancel sibling tasks.
3. `Email sent`, followed by `Payment failed`.
4. Use a shared `CancellationTokenSource`, request cancellation when an individual operation fails, and pass the token to operations that support cooperative cancellation. Do not wait until the outer `WhenAll` catch block to request early cancellation.
