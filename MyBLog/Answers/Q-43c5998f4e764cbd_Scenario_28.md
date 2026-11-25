# Question ID: Q-43c5998f4e764cbd

### Real-world scenario

An AI assistant invents a method that does not exist in the installed library.

### Step-by-step explanation

1. Ground the task in repository files, dependency versions and verified documentation.

2. Ask the agent to state assumptions and identify unknowns. Break work into small changes.

3. Compile, run targeted tests and static analysis; inspect generated SQL or runtime behavior where relevant.

4. Manually review security and correctness. Keep secrets protected and improve reusable instructions based on failures.

### Execution flow

```text
Context → generated change → compile/test → human review
```

### Common mistakes and best practices

Confidence is not proof. Verification matters more than repeated prompting.

### Interview-ready answer

Provide relevant source files, explicit constraints and verified documentation. Ask the agent to identify assumptions and avoid invented APIs. Use small changes, compile, run tests and static analysis, and manually review security and correctness. Treat generated code as untrusted until verified.
