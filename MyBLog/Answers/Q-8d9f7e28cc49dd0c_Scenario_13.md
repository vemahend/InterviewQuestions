# Question ID: Q-8d9f7e28cc49dd0c

### Answer

```csharp
var result = await db.Employees
    .Where(e => e.Salary > db.Employees
        .Where(x => x.DepartmentId == e.DepartmentId)
        .Average(x => x.Salary))
    .AsNoTracking()
    .ToListAsync();
```
The correlated average is calculated per department. Inspect generated SQL and indexes for large datasets.
