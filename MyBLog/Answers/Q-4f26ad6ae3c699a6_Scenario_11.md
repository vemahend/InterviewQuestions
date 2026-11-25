# Question ID: Q-4f26ad6ae3c699a6

### Answer

```csharp
var duplicates = await db.Customers
    .GroupBy(c => c.Email)
    .Where(g => g.Count() > 1)
    .Select(g => new { Email = g.Key, Count = g.Count() })
    .ToListAsync();
```
GroupBy creates groups; Key is the email and Count counts customers, not characters. Filter before materializing so SQL Server performs the aggregation. Decide how to handle null emails and case sensitivity.
