# Question ID: Q-f066b4ddbf74b7ea

### Real-world scenario

An attacker obtains a passkey challenge sent to the browser.

### Step-by-step explanation

1. Generate an unpredictable challenge, bind it to the ceremony and expire it quickly.

2. The authenticator signs data bound to the challenge and relying party with its private key; the key never leaves the authenticator in the assertion.

3. Verify challenge, origin, relying party identifier hash, signature, credential ownership and required user verification.

4. Consume the challenge atomically and protect the session against theft and relay attacks.

### Execution flow

```text
Challenge → authenticator → signed assertion → server verifies public key
```

### Common mistakes and best practices

A challenge alone is not a bearer credential. Never accept replayed challenges.

### Interview-ready answer

A challenge alone is not enough to authenticate: the attacker needs a valid signature from the credential private key. Generate unpredictable challenges, bind them to the authentication ceremony, expire them quickly and consume once. Verify origin, relying party identifier, signature and required user verification.
