# Question ID: Q-4eb073e8607b7fdb

### Real-world scenario

A team repeatedly asks an agent to review APIs and follow architecture conventions.

### Step-by-step explanation

1. Create focused skills with clear triggers, inputs, steps and acceptance criteria. Keep project conventions in repository instructions such as CLAUDE.md.

2. For a review skill include authorization, validation, logging, transactions, concurrency, performance and tests.

3. Route tasks to relevant skills, require small diffs and build/test evidence, and define when to ask for clarification.

4. Version skills, review changes and evaluate on representative tasks. Humans retain approval responsibility.

### Execution flow

```text
Task → skill → repository context → implementation → tests → human review
```

### Common mistakes and best practices

Avoid a single enormous skill. Instructions do not guarantee correctness.

### Interview-ready answer

Create reusable skills for recurring tasks such as code review, testing and implementation. Document repository conventions, security rules and acceptance criteria in project instructions. Route tasks to the relevant skill, require build and test evidence, and keep a human responsible for final approval.
