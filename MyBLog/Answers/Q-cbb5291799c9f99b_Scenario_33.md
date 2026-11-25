# Question ID: Q-cbb5291799c9f99b

### Real-world scenario

A product list filters thousands of items whenever an unrelated modal opens.

### Step-by-step explanation

1. Measure with React Profiler and identify the expensive pure calculation.

2. Wrap it in useMemo with all reactive dependencies. React can reuse the result when dependencies are unchanged.

3. For very large lists consider pagination, server-side filtering or virtualization.

4. Verify the result updates correctly when products or search changes.

### Execution flow

```text
Render → dependencies unchanged? reuse : recalculate
```

### Practical example

```tsx
const filtered = useMemo(
  () => products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
  [products, search]
);
```

### Common mistakes and best practices

Do not omit dependencies or use useMemo for side effects. It is an optimization, not a correctness guarantee.

### Interview-ready answer

Use useMemo to cache an expensive pure calculation between renders while its dependencies remain unchanged. Include every reactive dependency. Measure first; memoization has overhead and is a performance optimization, not a correctness guarantee.
