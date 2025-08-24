# API Reference - Midnight KYC Attestation DApp

## Table of Contents
1. [BBoardAPI Class](#bboardapi-class)
2. [Contract Functions](#contract-functions)
3. [Types and Interfaces](#types-and-interfaces)
4. [Providers](#providers)
5. [Events and Observables](#events-and-observables)
6. [Error Handling](#error-handling)

## BBoardAPI Class

The main API class for interacting with the KYC attestation contract.

### Static Methods

#### `deploy(providers: BBoardProviders, logger: Logger): Promise<BBoardAPI>`
Deploys a new KYC attestation contract to the blockchain.

**Parameters:**
- `providers`: Object containing all required provider instances
- `logger`: Pino logger instance for logging

**Returns:** Promise resolving to BBoardAPI instance

**Example:**
```typescript
const api = await BBoardAPI.deploy(providers, logger);
console.log(`Contract deployed at: ${api.deployedContractAddress}`);
```

#### `join(providers: BBoardProviders, contractAddress: string, logger: Logger): Promise<BBoardAPI>`
Joins an existing KYC attestation contract.

**Parameters:**
- `providers`: Object containing all required provider instances
- `contractAddress`: Hex string address of the contract to join
- `logger`: Pino logger instance

**Returns:** Promise resolving to BBoardAPI instance

**Example:**
```typescript
const api = await BBoardAPI.join(providers, "0x1234...", logger);
```

### Instance Properties

#### `deployedContractAddress: string`
The address of the deployed contract in hex format.

#### `ledgerState$: Observable<BBoardDerivedState>`
Observable stream of the current ledger state combined with private state.

### User Methods

#### `enrollOnce(age: number, country: string): Promise<TransactionId>`
Enrolls a user for KYC attestation with age and country verification.

**Parameters:**
- `age`: User's age as a number (must be >= allowedMinAge)
- `country`: ISO-3166-1 alpha-2 country code (e.g., "US", "AR")

**Returns:** Transaction ID of the enrollment transaction

**Example:**
```typescript
const txId = await api.enrollOnce(25, "AR");
```

#### `selfUpgradeToAdult(age: number): Promise<TransactionId>`
Upgrades user's attestation to adult status when they meet the age requirement.

**Parameters:**
- `age`: User's current age

**Returns:** Transaction ID

**Example:**
```typescript
const txId = await api.selfUpgradeToAdult(21);
```

#### `selfRefreshCountry(country: string): Promise<TransactionId>`
Updates user's country attestation.

**Parameters:**
- `country`: ISO-3166-1 alpha-2 country code

**Returns:** Transaction ID

**Example:**
```typescript
const txId = await api.selfRefreshCountry("US");
```

### Admin Methods

#### `setAllowedMinAge(age: number): Promise<TransactionId>`
Sets the minimum age requirement for adult attestation (owner only).

**Parameters:**
- `age`: Minimum age (must be > 0)

**Returns:** Transaction ID

**Example:**
```typescript
const txId = await api.setAllowedMinAge(18);
```

#### `setAllowedCountry(country: string): Promise<TransactionId>`
Sets the allowed country for attestation (owner only).

**Parameters:**
- `country`: ISO-3166-1 alpha-2 country code

**Returns:** Transaction ID

**Example:**
```typescript
const txId = await api.setAllowedCountry("US");
```

#### `revokeUpk(userPublicKey: Bytes<32>): Promise<TransactionId>`
Revokes a user's attestation (owner only).

**Parameters:**
- `userPublicKey`: 32-byte public key of the user

**Returns:** Transaction ID

#### `setAdultFlag(userPublicKey: Bytes<32>, value: 0 | 1): Promise<TransactionId>`
Manually sets a user's adult status (owner only).

**Parameters:**
- `userPublicKey`: 32-byte public key
- `value`: 1 for adult, 0 for not adult

**Returns:** Transaction ID

#### `setCountryFlag(userPublicKey: Bytes<32>, value: 0 | 1): Promise<TransactionId>`
Manually sets a user's country status (owner only).

**Parameters:**
- `userPublicKey`: 32-byte public key
- `value`: 1 for in allowed country, 0 for not

**Returns:** Transaction ID

### Query Methods

#### `checkAdultByUpk(userPublicKey: Bytes<32>): Promise<boolean>`
Checks if a user has adult attestation.

**Parameters:**
- `userPublicKey`: 32-byte public key

**Returns:** Boolean indicating adult status

#### `checkCountryByUpk(userPublicKey: Bytes<32>): Promise<boolean>`
Checks if a user has valid country attestation.

**Parameters:**
- `userPublicKey`: 32-byte public key

**Returns:** Boolean indicating country status

#### `checkEligibleByUpk(userPublicKey: Bytes<32>): Promise<boolean>`
Checks if a user is fully eligible (adult AND in allowed country).

**Parameters:**
- `userPublicKey`: 32-byte public key

**Returns:** Boolean indicating eligibility

#### `checkAdultSelf(): Promise<boolean>`
Checks current user's adult status using their private key.

**Returns:** Boolean indicating adult status

#### `checkCountrySelf(): Promise<boolean>`
Checks current user's country status using their private key.

**Returns:** Boolean indicating country status

#### `checkEligibleSelf(): Promise<boolean>`
Checks current user's full eligibility using their private key.

**Returns:** Boolean indicating eligibility

### Ownership Methods

#### `transferOwnership(newOwner: Either<ZswapCoinPublicKey, ContractAddress>): Promise<TransactionId>`
Transfers contract ownership to a new address (owner only).

**Parameters:**
- `newOwner`: Either a public key or contract address

**Returns:** Transaction ID

#### `renounceOwnership(): Promise<TransactionId>`
Renounces ownership, leaving the contract without an owner (owner only).

**Returns:** Transaction ID

## Contract Functions

Direct contract circuit functions available through the API.

### Constructor
```compact
constructor(initialOwner: Either<ZswapCoinPublicKey, ContractAddress>)
```
Initializes the contract with an owner and default policies.

### State Getters
```compact
getEpoch(): Uint<64>
getInstanceBytes(): Bytes<32>
getAllowedCountry(): Bytes<2>
getAllowedMinAge(): Uint<8>
```

### Admin Circuits
```compact
bumpEpoch(): []
revokeUpk(uPk: Bytes<32>): []
setAdultFlag(uPk: Bytes<32>, v: Uint<1>): []
setCountryFlag(uPk: Bytes<32>, v: Uint<1>): []
setAllowedMinAge(age: Uint<8>): []
setAllowedCountry(country: Bytes<2>): []
```

### User Circuits
```compact
enrollOnce(ageBytes: Bytes<32>, country: Bytes<2>): []
selfUpgradeToAdult(ageBytes: Bytes<32>): []
selfRefreshCountry(country: Bytes<2>): []
```

### Query Circuits
```compact
checkAdultByUpk(uPk: Bytes<32>): Uint<1>
checkCountryByUpk(uPk: Bytes<32>): Uint<1>
checkEligibleByUpk(uPk: Bytes<32>): Uint<1>
checkAdultSelf(): Uint<1>
checkCountrySelf(): Uint<1>
checkEligibleSelf(): Uint<1>
```

## Types and Interfaces

### Core Types

#### `Attestation`
```typescript
interface Attestation {
  epoch: bigint;      // Policy version when issued
  adult: 0 | 1;       // Adult status flag
  inCountry: 0 | 1;   // Country status flag
}
```

#### `BBoardDerivedState`
```typescript
interface BBoardDerivedState {
  state: State;           // VACANT or OCCUPIED
  message?: string;       // Current message (if occupied)
  sequence: number;       // Sequence number
  isOwner: boolean;       // Whether current user owns message
  owner: Bytes<32>;       // Public key of owner
  attestations: Map<string, Attestation>;
}
```

#### `BBoardPrivateState`
```typescript
interface BBoardPrivateState {
  secretKey: Bytes<32>;   // User's secret key
}
```

#### `DeployedBBoardContract`
```typescript
interface DeployedBBoardContract {
  deployTxData: {
    public: {
      contractAddress: ContractAddress;
      transactionId: TransactionId;
    }
  }
}
```

### Provider Types

#### `BBoardProviders`
```typescript
interface BBoardProviders {
  privateStateProvider: PrivateStateProvider<BBoardPrivateState>;
  zkConfigProvider: ZkConfigProvider;
  proofProvider: ProofProvider;
  publicDataProvider: PublicDataProvider;
  walletProvider: WalletProvider;
  midnightProvider: MidnightProvider;
}
```

## Providers

### PrivateStateProvider
Manages local private state storage using LevelDB.

```typescript
const privateStateProvider = levelPrivateStateProvider<BBoardPrivateState>({
  dbPath: './private-state'
});
```

### ZkConfigProvider
Fetches zero-knowledge circuit configurations.

```typescript
// For Node.js
const zkConfigProvider = new NodeZkConfigProvider(configDir);

// For browser
const zkConfigProvider = new FetchZkConfigProvider(configUrl);
```

### ProofProvider
Generates zero-knowledge proofs.

```typescript
const proofProvider = httpClientProofProvider(proofServerUrl);
```

### PublicDataProvider
Queries on-chain state via indexer.

```typescript
const publicDataProvider = indexerPublicDataProvider(indexerUrl);
```

### WalletProvider
Handles transaction signing and balancing.

```typescript
const wallet = await WalletBuilder.build({
  seed: walletSeed,
  network: networkId
});

const walletProvider = {
  wallet,
  coinPublicKey: wallet.coinPublicKey
};
```

### MidnightProvider
Submits transactions to the network.

```typescript
const midnightProvider = {
  submitTransaction: async (tx: Transaction) => {
    // Submit to network
  }
};
```

## Events and Observables

### Ledger State Observable
```typescript
api.ledgerState$.subscribe((state: BBoardDerivedState) => {
  console.log('State updated:', state);
  console.log('Is owner:', state.isOwner);
  console.log('Attestations:', state.attestations);
});
```

### Transaction Events
```typescript
// Listen for transaction confirmation
api.on('transactionConfirmed', (txId: TransactionId) => {
  console.log('Transaction confirmed:', txId);
});

// Listen for errors
api.on('error', (error: Error) => {
  console.error('API error:', error);
});
```

## Error Handling

### Common Errors

#### `AssertionError`
Thrown when contract assertions fail.

```typescript
try {
  await api.enrollOnce(17, "US"); // If min age is 18
} catch (error) {
  if (error.message.includes("age policy failed")) {
    console.log("User does not meet age requirement");
  }
}
```

#### `NoRecordError`
Thrown when querying non-existent attestations.

```typescript
try {
  await api.checkAdultByUpk(unknownKey);
} catch (error) {
  if (error.message.includes("no record")) {
    console.log("User not enrolled");
  }
}
```

#### `OnlyOwnerError`
Thrown when non-owner calls admin functions.

```typescript
try {
  await api.setAllowedMinAge(21);
} catch (error) {
  if (error.message.includes("Ownable")) {
    console.log("Only contract owner can call this");
  }
}
```

### Error Handling Best Practices

```typescript
// Wrap API calls in try-catch
async function safeEnroll(api: BBoardAPI, age: number, country: string) {
  try {
    const txId = await api.enrollOnce(age, country);
    console.log('Enrolled successfully:', txId);
    return { success: true, txId };
  } catch (error) {
    console.error('Enrollment failed:', error);
    return { success: false, error: error.message };
  }
}

// Use error boundaries in React
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('UI Error:', error, errorInfo);
  }
}

// Validate inputs before API calls
function validateAge(age: number): boolean {
  return age > 0 && age < 150;
}

function validateCountry(country: string): boolean {
  return /^[A-Z]{2}$/.test(country);
}
```

## Usage Examples

### Complete Enrollment Flow
```typescript
import { BBoardAPI } from './api';
import { createProviders } from './providers';

async function enrollUser() {
  // Setup providers
  const providers = await createProviders();
  const logger = pino();
  
  // Deploy or join contract
  const api = await BBoardAPI.deploy(providers, logger);
  
  // Set policies (admin only)
  await api.setAllowedMinAge(18);
  await api.setAllowedCountry("US");
  
  // Enroll user
  const txId = await api.enrollOnce(25, "US");
  console.log('Enrollment transaction:', txId);
  
  // Check attestation
  const isEligible = await api.checkEligibleSelf();
  console.log('User eligible:', isEligible);
  
  // Monitor state changes
  api.ledgerState$.subscribe(state => {
    console.log('Current attestations:', state.attestations);
  });
}
```

### Admin Management
```typescript
async function manageContract(api: BBoardAPI) {
  // Update policies
  await api.setAllowedMinAge(21);
  await api.setAllowedCountry("CA");
  
  // Revoke suspicious user
  const suspiciousKey = hexToBytes("0x1234...");
  await api.revokeUpk(suspiciousKey);
  
  // Transfer ownership
  const newOwner = { tag: 'left', value: newOwnerKey };
  await api.transferOwnership(newOwner);
}
```

### Query Attestations
```typescript
async function queryUsers(api: BBoardAPI, userKeys: Bytes<32>[]) {
  const results = await Promise.all(
    userKeys.map(async (key) => {
      try {
        const isAdult = await api.checkAdultByUpk(key);
        const inCountry = await api.checkCountryByUpk(key);
        const eligible = await api.checkEligibleByUpk(key);
        
        return {
          key: toHex(key),
          isAdult,
          inCountry,
          eligible
        };
      } catch (error) {
        return {
          key: toHex(key),
          error: 'Not enrolled'
        };
      }
    })
  );
  
  console.table(results);
}
```

---

For more information, see the [main documentation](DOCUMENTATION.md) or visit [Midnight Network docs](https://docs.midnight.network).
