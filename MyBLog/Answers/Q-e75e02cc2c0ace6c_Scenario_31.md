# Question ID: Q-e75e02cc2c0ace6c

### Answer

Use useState for local state, lift state for nearby components, Context for shared values with modest update frequency, and Redux Toolkit for complex shared client state requiring predictable updates and selectors. For server data consider a query cache. Choose the simplest option that meets the requirements.
