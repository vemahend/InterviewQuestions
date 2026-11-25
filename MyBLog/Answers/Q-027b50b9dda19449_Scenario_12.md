# Question ID: Q-027b50b9dda19449

### Answer

```csharp
var salary = await db.Employees
    .Where(e => e.Department == "IT")
    .Select(e => (decimal?)e.Salary)
    .Distinct()
    .OrderByDescending(s => s)
    .Skip(1)
    .FirstOrDefaultAsync();
```
Distinct handles tied salaries; nullable projection returns null when fewer than two distinct salaries exist.
