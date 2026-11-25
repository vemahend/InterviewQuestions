# Question ID: Q-ccd02a5bcd0fbf95

### Answer

Calling ToListAsync before Where loads unnecessary rows into memory and moves subsequent filtering to the application. Keep the query as IQueryable, apply filters and projection first, then materialize. Use AsNoTracking for read-only entity queries and pagination for large results.
