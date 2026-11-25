# Question ID: Q-a2600b29375a5f4c

### Answer

The C# compiler generates an asynchronous state machine. When an awaited task is incomplete, the method saves its state and registers a continuation. Once the task completes, the continuation is invoked or scheduled and resumes the state machine, executing the remaining code.

```csharp
Console.WriteLine("Before await");
await Task.Delay(2000);
Console.WriteLine("After await");
```

Execution flow:

1. The method starts executing on the current thread.
2. The incomplete task causes the method to suspend without blocking the thread.
3. The task completes.
4. The continuation resumes the method on an appropriate thread.

In ASP.NET Core, the continuation may execute on the same or a different thread pool thread. In Windows Forms, normal await generally returns to the user interface thread when called from that context. If the task is already complete, execution can continue synchronously without suspension.
