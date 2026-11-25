# Question ID: Q-f066b4ddbf74b7ea

### Answer

A challenge alone is not enough to authenticate: the attacker needs a valid signature from the credential private key. Generate unpredictable challenges, bind them to the authentication ceremony, expire them quickly and consume once. Verify origin, relying party identifier, signature and required user verification.
