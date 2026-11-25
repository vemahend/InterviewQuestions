# Question ID: Q-e75e02cc2c0ace6c

### Real-world scenario

Several React components need customer information.

### Step-by-step explanation

1. Use useState for local inputs and modal state; lift state to a common parent for a small subtree.

2. Use Context for broadly shared values with manageable update frequency, such as theme or authenticated user.

3. Use Redux Toolkit for complex shared client state needing predictable reducers, selectors and middleware.

4. For remote customer data consider a server-state query cache. Start with the simplest suitable approach.

### Execution flow

```text
Local → useState; shared theme → Context; complex workflow → Redux
```

### Common mistakes and best practices

Do not put every input into Redux or treat Context as a server-state cache.

### Interview-ready answer

Use useState for local state, lift state for nearby components, Context for shared values with modest update frequency, and Redux Toolkit for complex shared client state requiring predictable updates and selectors. For server data consider a query cache. Choose the simplest option that meets the requirements.
