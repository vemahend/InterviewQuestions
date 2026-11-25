# Question ID: Q-4f26ad6ae3c699a6

### Real-world scenario

Emails a@x.com, b@x.com, a@x.com should produce a@x.com with count 2.

### Step-by-step explanation

1. GroupBy creates one group per email. Key is the email; Count counts records.

2. Where keeps groups with more than one record. Select projects email and count.

3. ToListAsync executes the composed query in SQL Server. Decide how to handle nulls and collation-based case sensitivity.

4. Inspect execution plans and consider an email index for large tables.

### Execution flow

```text
Customers → GROUP BY Email → HAVING COUNT(*) > 1
```

### Practical example

```csharp
var duplicates = await db.Customers
    .GroupBy(c => c.Email)
    .Where(g => g.Count() > 1)
    .Select(g => new { Email = g.Key, Count = g.Count() })
    .ToListAsync();
```
GroupBy creates groups; Key is the email and Count counts customers, not characters. Filter before materializing so SQL Server performs the aggregation. Decide how to handle null emails and case sensitivity.

### Common mistakes and best practices

Count on an email string counts characters, not customers.

### Interview-ready answer

GroupBy creates groups; Key is the email and Count counts customers, not characters. Filter before materializing so SQL Server performs the aggregation. Decide how to handle null emails and case sensitivity.
