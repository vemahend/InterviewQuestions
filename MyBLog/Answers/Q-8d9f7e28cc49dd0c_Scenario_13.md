# Question ID: Q-8d9f7e28cc49dd0c

### Real-world scenario

IT salaries 80,000 and 120,000 average 100,000; HR salaries 60,000 and 80,000 average 70,000.

### Step-by-step explanation

1. For each employee, filter the inner query to that employee's department.

2. Calculate the department average and compare the employee salary against it.

3. Keep both queries as IQueryable so the database performs the calculation. Materialize at the end.

4. For large tables compare execution plans with a grouped average joined to employees. Define nullable salary behavior.

### Execution flow

```text
Employee → same department → average → compare salary
```

### Practical example

```csharp
var result = await db.Employees
    .Where(e => e.Salary > db.Employees
        .Where(x => x.DepartmentId == e.DepartmentId)
        .Average(x => x.Salary))
    .AsNoTracking()
    .ToListAsync();
```
The correlated average is calculated per department. Inspect generated SQL and indexes for large datasets.

### Common mistakes and best practices

Do not compare against the company-wide average or execute one query per employee.

### Interview-ready answer

The correlated average is calculated per department. Inspect generated SQL and indexes for large datasets.
