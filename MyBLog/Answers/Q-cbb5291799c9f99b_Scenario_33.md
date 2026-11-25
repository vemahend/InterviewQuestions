# Question ID: Q-cbb5291799c9f99b

### Answer

Use useMemo to cache an expensive pure calculation between renders while its dependencies remain unchanged. Include every reactive dependency. Measure first; memoization has overhead and is a performance optimization, not a correctness guarantee.
