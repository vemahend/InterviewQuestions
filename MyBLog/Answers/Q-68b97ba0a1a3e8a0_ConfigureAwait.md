# Question ID: Q-68b97ba0a1a3e8a0

### Answer

ConfigureAwait(false) tells .NET not to require the continuation to return to the captured synchronization context or non-default task scheduler. It is useful in reusable libraries where the remaining code does not depend on the original context.

The continuation is the remaining code after await. The synchronization context is a mechanism that controls where that code should execute; it is not itself a thread.

### Real-world example: Windows desktop application

```csharp
// Called from user interface Thread 1
var customer = await GetCustomerAsync();
// Returns to the user interface thread
lblName.Text = customer.Name;
```

```csharp
// Called from user interface Thread 1
var customer = await GetCustomerAsync().ConfigureAwait(false);
// May resume on another thread, for example Thread 5
Console.WriteLine(customer.Name);
```

Do not directly update user interface controls after the second example unless you explicitly dispatch back to the user interface thread.

```text
Normal await (Windows Forms)       ConfigureAwait(false)
Thread 1                          Thread 1
    |                                 |
    v                                 v
Await database (5 seconds)        Await database (5 seconds)
    |                                 |
    v                                 v
Thread 1 resumes                  Thread 5 may resume
```

Both approaches release the calling thread while awaiting an incomplete asynchronous operation. ConfigureAwait(false) does not guarantee a different thread or create a new thread.

### Deadlock example

In a Windows Forms event handler, calling `GetDataAsync().Result` blocks the user interface thread. If GetDataAsync uses normal await and needs to resume on that same thread, a deadlock can occur.

```csharp
async Task<string> GetDataAsync()
{
    await Task.Delay(2000).ConfigureAwait(false);
    return "Success";
}
```

In this specific example, ConfigureAwait(false) allows the continuation to finish without returning to the blocked user interface thread. The caller still blocks temporarily if it uses .Result. The preferred solution is to use await throughout rather than blocking with .Result or .Wait().

### ASP.NET Core

ASP.NET Core does not have a custom synchronization context by default. Both normal await and ConfigureAwait(false) can resume on the same or a different thread, so ConfigureAwait(false) is generally unnecessary in ASP.NET Core application code.

| Behaviour | Normal await | ConfigureAwait(false) |
|---|---|---|
| Blocks thread while awaiting an incomplete task | No | No |
| Attempts to capture context if present | Yes | No |
| Guarantees a different thread | No | No |
| Suitable for updating UI directly after awaiting from UI context | Yes | Not guaranteed |

**Interview-ready answer:** I use ConfigureAwait(false) in reusable libraries when the continuation does not need the original synchronization context. It can avoid unnecessary context scheduling and certain deadlocks. In ASP.NET Core, it is generally not required because there is no custom synchronization context by default.

**Remember:** await avoids blocking while waiting; ConfigureAwait(false) controls context capture; .Result and .Wait() block when the task is incomplete.

All thread numbers and timings above are illustrative, not measured runtime results.
