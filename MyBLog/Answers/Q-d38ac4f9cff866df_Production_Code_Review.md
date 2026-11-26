# Question ID: Q-d38ac4f9cff866df

### Scenario: Improve a customer endpoint for production

Assume two million customers, ten million orders, 10,000 requests per minute, sensitive customer information and multiple application instances.

```csharp
[ApiController]
[Route("api/customers")]
public class CustomerController : ControllerBase
{
    private readonly AppDbContext _context;

    public CustomerController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("{id}")]
    public IActionResult GetCustomer(int id)
    {
        var customers = _context.Customers
            .Include(x => x.Orders)
            .ToList();

        var customer = customers
            .FirstOrDefault(x => x.Id == id);

        return Ok(customer);
    }
}
```

### 1. Security and validation

- Require authentication using the Authorize attribute or a global authorization policy.
- Check resource-level authorization: an authenticated user must not automatically be allowed to access every customer.
- Validate that the ID is greater than zero.
- Return a Data Transfer Object (DTO) containing only the required properties, not the entire database entity.

### 2. Database performance and memory

The biggest problem is calling ToList before filtering. This loads every customer and their orders into application memory. Move the filter before materialization so the database retrieves only the requested customer.

Use Select to project the required properties. If only the order count is required, use Orders.Count() rather than loading the entire collection. Check indexes and execution plans, including the customer primary key and the orders customer foreign key.

### 3. Asynchronous programming and tracking

Use FirstOrDefaultAsync instead of synchronous database calls. Synchronous input/output blocks a thread while waiting and can contribute to thread-pool starvation under load.

Pass a CancellationToken to the database query. For read-only entity queries, AsNoTracking avoids unnecessary change tracking. Pure scalar DTO projections do not track entities anyway.

### 4. AsSplitQuery and Cartesian explosion

Cartesian explosion can occur when multiple sibling collections are included, such as Orders and Addresses. For a customer with 100 orders and 10 addresses, a joined query may produce 1,000 rows. Split queries can return approximately 111 rows across three queries instead, but introduce additional round trips and possible consistency considerations.

The original query has only one Include, so do not automatically use AsSplitQuery. Projection is a better starting point here.

### 5. Concurrency and missing records

Optimistic concurrency using RowVersion is useful for detecting conflicting updates or deletes. It is not normally required for this read-only GET endpoint.

FirstOrDefault returns null when no matching customer exists. Returning Ok(null) does not itself throw a NullReferenceException. Explicitly return NotFound instead.

### 6. Improved implementation

Assume the customer has a string OwnerId matching the authenticated user's identifier. The actual authorization model could instead use tenant, organization or resource permissions.

```csharp
[ApiController]
[Authorize]
[Route("api/customers")]
public class CustomerController : ControllerBase
{
    private readonly AppDbContext _context;

    public CustomerController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetCustomer(
        int id,
        CancellationToken cancellationToken)
    {
        if (id <= 0)
            return BadRequest("Invalid customer ID.");

        var userId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
            return Forbid();

        var customer = await _context.Customers
            .AsNoTracking()
            .Where(x => x.Id == id &&
                        x.OwnerId == userId)
            .Select(x => new CustomerDto
            {
                Id = x.Id,
                Name = x.Name,
                TotalOrders = x.Orders.Count()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (customer == null)
            return NotFound();

        return Ok(customer);
    }
}

public sealed class CustomerDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public int TotalOrders { get; init; }
}
```

This example returns 404 for both nonexistent and inaccessible customers to avoid disclosing their existence. Configure authentication, authorization and Entity Framework Core dependency injection separately.

### 7. Additional production considerations

- Centralized exception handling with safe error responses.
- Structured logging and correlation identifiers without sensitive customer data.
- Monitor latency, error rates, database performance and resource utilization.
- Consider rate limiting and caching only when justified by measurements; never share cached private data across unauthorized users.
- Keep business logic and authorization policies maintainable; introduce a service layer when complexity warrants it.
- Test invalid IDs, missing customers, unauthorized access, cancellation and high-volume traffic.

### Strong interview answer

First, I would review security and authorization, including whether the authenticated user can access the requested customer. The biggest performance issue is calling ToList before filtering, which loads millions of records into memory. I would filter in the database and use projection to retrieve only required properties.

I would use asynchronous database operations, support cancellation tokens, validate input and return appropriate response status codes. Finally, I would ensure centralized exception handling, structured logging, monitoring and appropriate test coverage. I would measure performance before introducing additional caching or split queries.
