# Question ID: Q-4f201d841e8303be

### Real-world scenario

Claude Code repeatedly proposes a fix that fails the same test.

### Step-by-step explanation

1. Stop repeating the prompt and inspect the actual error and diff.

2. Provide a minimal reproducible example, relevant source files and explicit acceptance criteria.

3. Ask for a small change, stated assumptions and targeted tests. Review the results yourself.

4. Set an attempt or time limit; switch approach or implement manually if needed. Capture reusable lessons in project instructions.

### Execution flow

```text
Failure → evidence → narrow task → change → test → accept or switch
```

### Common mistakes and best practices

Never merge because the agent claims tests passed.

### Interview-ready answer

Stop repeating the same prompt. Inspect the failing code and tests, narrow the task, provide relevant repository context and explicit acceptance criteria, and ask for a small verifiable change. If it still fails, implement manually or change approach. Capture recurring lessons in agent instructions or skills and review all output before merging.
