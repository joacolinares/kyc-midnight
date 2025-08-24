# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a Midnight Network blockchain DApp implementing a KYC (Know Your Customer) attestation system with age and country verification. The project was originally a bulletin board example that has been modified to handle KYC attestations.

### Tech Stack
- **Blockchain**: Midnight Network (privacy-focused blockchain)
- **Smart Contract Language**: Compact 0.17
- **Runtime**: TypeScript 5.8.3
- **Frontend**: React 19 with Material-UI
- **Build Tools**: Vite, TypeScript

## Repository Structure

- `/contract` - Compact smart contract and TypeScript witnesses
  - `src/bboard.compact` - Main KYC attestation contract
  - `src/witnesses.ts` - Witness functions for private state
  - `src/managed/` - Compiled contract artifacts
- `/api` - Shared types and contract API abstractions
- `/bboard-cli` - Command-line interface for contract interaction
- `/bboard-ui` - React web interface for the DApp
- Root workspace manages all packages via npm workspaces

## Development Commands

### Initial Setup (in order)
```bash
# 1. Install root dependencies
npm install --legacy-peer-deps

# 2. Install and build API
cd api
npm install
npm run build
cd ..

# 3. Install and compile contract
cd contract
npm install
npm run compact  # Compile Compact contract
npm run build     # Build TypeScript
cd ..

# 4. Install and run CLI (testnet)
cd bboard-cli
npm install
npm run build
npm run testnet-remote  # Connect to testnet with remote proof server
cd ..

# 5. Install and run UI (browser interface)
cd bboard-ui
npm install
npm run build:start  # Build and start local server
```

### Common Development Tasks

**Compile Compact Contract:**
```bash
cd contract
npm run compact
```

**Run Tests:**
```bash
cd contract
npm run test  # Uses Vitest
```

**Start CLI Application:**
```bash
cd bboard-cli
npm run testnet-remote     # Remote testnet
npm run testnet-local      # Local testnet  
npm run standalone         # Docker compose environment
```

**Start Web UI:**
```bash
cd bboard-ui
npm run dev           # Development server with hot reload
npm run build:start   # Production build and serve
```

**Linting:**
```bash
# Each package has its own lint command
npm run lint
```

**Type Checking:**
```bash
# Each package has typecheck command
npm run typecheck
```

## Architecture Overview

### Smart Contract (Compact)

The KYC contract (`bboard.compact`) implements:
- **Attestation Storage**: Maps user public keys to attestation records containing:
  - `epoch`: Policy version when attestation was issued
  - `adult`: 1 if user meets minimum age requirement
  - `inCountry`: 1 if user belongs to allowed country
- **Admin Functions**: Owner-controlled functions to set policies and manage attestations
- **User Functions**: Self-enrollment and attestation queries
- **Privacy**: Uses zero-knowledge proofs to verify age/country without revealing actual values

### Contract API Layer

The `BBoardAPI` class in `/api/src/index.ts` provides:
- Contract deployment and joining
- State management via RxJS observables
- Transaction submission methods for all contract circuits
- Integration with Midnight.js providers

### Private State Management

- Uses `BBoardPrivateState` containing user's secret key
- Shared across all contract instances (current limitation)
- Managed by `levelPrivateStateProvider` for browser/CLI persistence

### Provider Architecture

The system requires multiple providers:
- **privateStateProvider**: Manages local private state
- **zkConfigProvider**: Fetches zero-knowledge circuit configurations
- **proofProvider**: Generates zero-knowledge proofs
- **publicDataProvider**: Queries on-chain state via indexer
- **walletProvider**: Handles transaction signing and balancing
- **midnightProvider**: Submits transactions to network

## Contract Interaction Flow

1. **Deployment**: Admin deploys contract with initial owner and default policies
2. **Policy Setup**: Admin sets `allowedCountry` and `allowedMinAge`
3. **User Enrollment**: Users call `enrollOnce` with private age/country data
4. **Attestation**: Contract stores attestation on-chain without revealing private data
5. **Verification**: Anyone can check attestation status via public key

## Network Configuration

The project supports multiple network configurations:
- **Testnet Remote**: Connects to Midnight testnet with remote proof server
- **Testnet Local**: Local testnet instance
- **Standalone**: Docker-composed local environment

## Key Files to Understand

1. `/contract/src/bboard.compact` - Core smart contract logic
2. `/api/src/index.ts` - Main contract API implementation
3. `/bboard-cli/src/index.ts` - CLI application entry point
4. `/bboard-ui/src/contexts/BrowserDeployedBoardManager.ts` - Browser wallet integration

## Important Notes

- The project requires `--legacy-peer-deps` for npm install due to Vite dependencies
- WebSocket polyfill is required for Apollo GraphQL in Node.js environment
- The contract uses Compact language version 0.17
- Browser UI requires Midnight Lace wallet extension for transaction signing
- Private state is currently shared across all contract instances (limitation to be addressed)
