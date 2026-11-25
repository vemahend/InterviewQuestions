# Question ID: Q-e3d83f37e51782b8

### Real-world scenario

A product catalog repeatedly queries the same relatively stable records.

### Step-by-step explanation

1. Register IMemoryCache and use a stable cache key scoped to relevant tenant or data context.

2. Check the cache first. On miss, query only needed data and cache with a suitable expiration.

3. Invalidate after database updates. Consider Redis or another distributed cache for multiple instances.

4. Measure hit rate, memory and latency; protect against cache stampedes.

### Execution flow

```text
Hit → return; Miss → DB → cache → return
```

### Practical example

```csharp
// Register with builder.Services.AddMemoryCache();
var key = $"product:{id}";
if (!cache.TryGetValue<ProductDto>(key, out var product))
{
    product = await LoadProductAsync(id, ct);
    if (product is not null)
        cache.Set(key, product, TimeSpan.FromMinutes(5));
}
return product;
```
Simplified public catalog example; concurrent misses are not coordinated.

### Common mistakes and best practices

Cache-aside does not guarantee strong consistency. Never share sensitive data under an unscoped key.

### Interview-ready answer

Register IMemoryCache with AddMemoryCache. Use cache-aside: check a stable key, query the database on a miss, cache the result with a suitable expiration, and invalidate on updates. Use distributed caching for multiple application instances. Avoid stale or unauthorized data and consider cache stampede protection.
