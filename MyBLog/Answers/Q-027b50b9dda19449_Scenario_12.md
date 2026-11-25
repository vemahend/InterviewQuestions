# Question ID: Q-027b50b9dda19449

### Real-world scenario

IT salaries 120000, 120000, 100000, 80000 should return 100000.

### Step-by-step explanation

1. Filter the IT department first and project salary.

2. Distinct removes ties; OrderByDescending sorts highest first; Skip(1) skips the highest distinct salary.

3. A nullable salary projection returns null if there are fewer than two distinct salaries.

4. If asked for employees instead of salary, retrieve all employees matching that salary and department.

### Execution flow

```text
120000,120000,100000,80000 → distinct → sort → skip 1 → 100000
```

### Practical example

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

### Common mistakes and best practices

Do not skip before removing ties.

### Interview-ready answer

Distinct handles tied salaries; nullable projection returns null when fewer than two distinct salaries exist.
