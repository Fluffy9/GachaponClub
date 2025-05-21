# Gachapon Club

A decentralized NFT platform that reimagines the classic capsule toy experience but with any imaginable NFT. Users can buy a capsule, which contains a random NFT (of the same tier) or donate any approved NFT for a free capsule (of the same tier).

## 🌟 Overview

Gachapon Club is transforming the traditional NFT marketplace into an interactive and gamified experience. It combines the nostalgic appeal of capsule toys with a tokenomic design that brings that degen vibe. The project features a smart contract system that manages prize pools, handles random prize distribution, and ensures fair and transparent operations.

### Key Features
- Cute capsule machine simulation, with immersive effects
- Everything deployed on Sui Testnet
- Three cute NFTs available for free for testing
- Three-tier capsule system (Common, Rare, Epic)
- NFT donation system for capsule rewards
- Transparent random prize distribution
- Admin controls for prize pool management
- Responsive and modern UI with dark mode support

### Coming Soon 🚀
- **Security Audit**: I would like to fund a smart contract audit to ensure platform security
- **Enhanced Effects**: More engaging animations and effects to bring the capsule game experience to life
- **NFT Launchpad**: Partner with newly minting NFT collections to offer a fun way to launch
- **Flash Loans**: Investigate giving access to items held in the machine through NFT flash loans. It could be useful for participating in certain NFTs governance
- **DAO Governance**: Community-driven governance for machine operations and NFT stewardship

## 🛠️ How It Works

### Architecture

The platform is built using a modern tech stack:
- **Frontend**: React with TypeScript, Framer Motion for animations
- **Smart Contracts**: Move language on Sui blockchain
- **State Management**: React Context for wallet and UI state
- **Styling**: Tailwind CSS with custom animations

### Smart Contract Highlights
The contract provides several key functionalities:

1. **Minting Functions**
```move
public fun mint_common(machine: &mut Machine, payment: Coin<SUI>, ctx: &mut TxContext): CommonGachaNFT
public fun mint_rare(machine: &mut Machine, payment: Coin<SUI>, ctx: &mut TxContext): RareGachaNFT
public fun mint_epic(machine: &mut Machine, payment: Coin<SUI>, ctx: &mut TxContext): EpicGachaNFT
```
- Mint different tiers of Gacha NFTs with SUI payment
- Updates machine stats and emits MintEvent

2. **Trading Functions**
```move
public fun trade_common(machine: &mut Machine, nft: CommonGachaNFT, random: &Random, ctx: &mut TxContext): PrizeInfo
public fun trade_rare(machine: &mut Machine, nft: RareGachaNFT, random: &Random, ctx: &mut TxContext): PrizeInfo
public fun trade_epic(machine: &mut Machine, nft: EpicGachaNFT, random: &Random, ctx: &mut TxContext): PrizeInfo
```
- Trade Gacha NFTs for random prizes
- Uses random number generation
- Emits TradeEvent with transaction details

3. **Donation Functions**
```move
public fun donate_nft_common<T: key + store>(machine: &mut Machine, nft: T, ctx: &mut TxContext): CommonGachaNFT
public fun donate_nft_rare<T: key + store>(machine: &mut Machine, nft: T, ctx: &mut TxContext): RareGachaNFT
public fun donate_nft_epic<T: key + store>(machine: &mut Machine, nft: T, ctx: &mut TxContext): EpicGachaNFT
```
- Donate approved NFTs to the machine
- Verifies NFT type approval
- Adds donated NFTs to prize pool
- Gives the user a free capsule for the tier they are donating to
- Emits DonateEvent

4. **Admin Functions**
```move
public fun approve_nft<T>(_admin_cap: &AdminCap, tier: vector<u8>, approve: bool, machine: &mut Machine)
public fun add_prize<T: key + store>(_admin_cap: &AdminCap, nft: T, nft_type: TypeName, tier: vector<u8>, machine: &mut Machine, ctx: &mut TxContext)
public fun update_prices(_admin_cap: &AdminCap, machine: &mut Machine, common_price: u64, rare_price: u64, epic_price: u64)
public fun withdraw(_admin_cap: &AdminCap, machine: &mut Machine, amount: u64, ctx: &mut TxContext): Coin<SUI>
```
- Manage NFT approvals and prize pool
- Update capsule prices
- Withdraw funds from treasury
- All admin functions require AdminCap

5. **View Functions**
```move
public fun get_treasury_value(machine: &Machine): u64
public fun get_total_plays(machine: &Machine): u64
public fun get_total_rewards(machine: &Machine): u64
public fun get_prize_count(machine: &Machine, tier: vector<u8>): u64
public fun get_approved_nft_list(machine: &Machine): vector<TypeName>
public fun get_common_price(machine: &Machine): u64
public fun get_rare_price(machine: &Machine): u64
public fun get_epic_price(machine: &Machine): u64
```
- Read-only access to machine state
- Track prices, prize counts, and statistics

## 🚀 Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/GachaponClub.git
cd GachaponClub
```

### Prerequisites
- Node.js 16+
- Sui CLI
- A Sui wallet (e.g., Sui Wallet)


### Smart Contract Deployment

1. Build the Move contracts:
```bash
cd move/contracts
sui move build
```

2. Deploy to Sui network:
```bash
sui client publish --gas-budget 100000000 --skip-dependency-verification
```

3. Transfer the Admin Cap to your admin address (with cli)
```bash
sui client transfer \
  --object-id [ADMIN_CAP_ID] \
  --to [NEW_ADMIN_ADDRESS] \
  --gas-budget 100000000
```


### App Installation

1. Go to the React app:
```bash
cd GachaponClub/gacha
```

2. Install dependencies:
```bash
pnpm install
```

3. Modify the gacha/src/lib/constants.ts:
```ts
// Contract addresses
export const SUI_CONTRACT_ADDRESS = "0x4743115cdb2b555b45853fc9f326b1ed1c964c8745b12de42917bd1b50d06858";
export const SUI_MACHINE_ID = "0xc647d65891b6557e0dd47e336d486d994aba09e6e9895524fd322956348d3e7f";
export const SUI_MINTER_CAP_ID = "0x944957ab9ae187187380fb0e1856d8b18e291414f30ad50a6c698d31567667e5";
export const SUI_ADMIN_CAP_ID = "0x720961ed3f7aa8184ccc04e9ff29a2621ec49605522811207cfe8fdf774a2c5b";
export const SUI_UPGRADE_CAP_ID = "0x22ebc0cb87da9920109215094532f74c0bfaa5e752774dd8640f7caa51301565";

```

4. Start the development server:
```bash
pnpm run dev
```


