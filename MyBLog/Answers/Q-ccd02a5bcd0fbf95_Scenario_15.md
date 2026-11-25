# Question ID: Q-ccd02a5bcd0fbf95

### Real-world scenario

A table contains two million customers but the endpoint needs only 20 active customers.

### Step-by-step explanation

1. Keep the query as IQueryable and apply Where, ordering, projection and pagination before execution.

2. Select only necessary columns. Use AsNoTracking for read-only entity results.

3. Call ToListAsync at the end so filtering happens in SQL Server.

4. Inspect generated SQL, indexes and memory usage. Consider keyset pagination for deep pages.

### Execution flow

```text
Bad: DB → 2 million rows → filter; Good: DB WHERE → 20 rows
```

### Practical example

```csharp
var customers = await db.Customers.Where(c => c.IsActive)
    .OrderBy(c => c.Id).Select(c => new { c.Id, c.Name })
    .Take(20).ToListAsync(ct);
```

### Common mistakes and best practices

Async does not make unnecessary data retrieval efficient.

### Interview-ready answer

Calling ToListAsync before Where loads unnecessary rows into memory and moves subsequent filtering to the application. Keep the query as IQueryable, apply filters and projection first, then materialize. Use AsNoTracking for read-only entity queries and pagination for large results.
