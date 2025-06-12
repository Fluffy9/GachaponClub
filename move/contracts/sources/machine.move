/// Module: machine
/// Implements a Gacha machine for minting, trading, and donating NFTs.
/// Users can pay SUI to mint Gacha NFTs, trade them for random prizes, or donate approved NFTs to receive Gacha NFTs.
/// Admins manage prize pools, approve NFT types, and withdraw funds from the treasury.
#[allow(unused_use, lint(coin_field))]
module gacha::machine {
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::vec_set::{Self, VecSet};
use sui::bag::{Self, Bag};
use std::type_name::{Self, TypeName};
use sui::table::{Self, Table};
use sui::dynamic_field as df;
use std::string::{Self, String};
use sui::event;
use sui::object::{Self, UID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};
use sui::random::{Self, Random};
use gacha::gacha_nft::{Self, MinterCap, CommonGachaNFT, RareGachaNFT, EpicGachaNFT};

/// Error codes for various failure conditions.
const EInsufficientPayment: u64 = 0;
const EInsufficientTreasury: u64 = 2;
const ENoPrizesAvailable: u64 = 3;
const ENFTNotApproved: u64 = 4;
const EInvalidNFTType: u64 = 5;
const EInvalidTier: u64 = 6;
const EInvalidPrice: u64 = 7;

/// Admin capability for managing the machine.
public struct AdminCap has key, store {
    id: object::UID
}

/// Stores an NFT of any approved type as a prize.
public struct PrizeInfo has key, store {
    id: object::UID,
    nft_type: TypeName,
    tier: vector<u8>,
}

/// Manages prize pools for each tier (common, rare, epic).
public struct PrizePool has store {
    common_prizes: Bag,
    rare_prizes: Bag,
    epic_prizes: Bag,
}

/// Tracks the machine's state, including stats, treasury, and prize pools.
public struct Machine has key, store {
    id: object::UID,
    total_plays: u64,              // Total number of mints performed
    total_rewards: u64, 
    common_mints: u64,
    rare_mints: u64,
    epic_mints: u64,           // Total reward points (1 for Common, 2 for Rare, 3 for Epic)
    authorized_minter_caps: VecSet<object::ID>, // Authorized MinterCap IDs
    treasury: Coin<SUI>,           // Accumulated SUI payments
    approved_nfts: Table<TypeName, vector<u8>>, // Maps NFT type to tier (common, rare, epic)
    approved_nft_list: vector<TypeName>,        // List of approved NFT types for viewing
    prize_pool: PrizePool,         // Prize pools for each tier
    common_price: u64,             // Price for common NFTs in MIST
    rare_price: u64,               // Price for rare NFTs in MIST
    epic_price: u64,               // Price for epic NFTs in MIST
}

/// Event emitted when a user mints a Gacha NFT.
public struct MintEvent has copy, drop {
    sender: address,
    tier: vector<u8>,
    amount: u64,
    nft_type: TypeName,
}

/// Event emitted when a user trades a Gacha NFT for a prize.
public struct TradeEvent has copy, drop {
    sender: address,
    traded_nft_type: TypeName,
    prize_nft_type: TypeName,
    tier: vector<u8>,
}

/// Event emitted when a user donates an NFT and receives a Gacha NFT.
public struct DonateEvent has copy, drop {
    sender: address,
    donated_nft_type: TypeName,
    gacha_nft_type: TypeName,
    tier: vector<u8>,
}

/// Event emitted when an admin withdraws funds from the treasury.
public struct WithdrawEvent has copy, drop {
    sender: address,
    amount: u64,
}

/// Event emitted when an admin adds a prize to the pool.
public struct PrizeAddedEvent has copy, drop {
    sender: address,
    nft_type: TypeName,
    tier: vector<u8>,
}

/// Event emitted when an admin registers a MinterCap.
public struct MinterCapRegisteredEvent has copy, drop {
    sender: address,
    minter_cap_id: object::ID,
}

/// Event emitted when an admin approves or unapproves an NFT type.
public struct NFTApprovedEvent has copy, drop {
    nft_type: TypeName,
    tier: vector<u8>,
    approved: bool,
}

/// Event emitted when prices are updated.
public struct PricesUpdatedEvent has copy, drop {
    common_price: u64,
    rare_price: u64,
    epic_price: u64,
}

/// Pricing constants (in MIST, where 1 SUI = 10^9 MIST).
const DEFAULT_COMMON_PRICE: u64 = 10_000_000;  // .01 SUI
const DEFAULT_RARE_PRICE: u64 = 50_000_000;    // .05 SUI
const DEFAULT_EPIC_PRICE: u64 = 100_000_000;   // .1 SUI

/// Returns the mutable UID of a PrizeInfo.
/// @param prize: The PrizeInfo object.
/// @return: A mutable reference to the UID.
public fun get_prize_id(prize: &mut PrizeInfo): &mut object::UID {
    &mut prize.id
}

/// Returns the NFT type stored in a PrizeInfo.
/// @param prize: The PrizeInfo object.
/// @return: The TypeName of the stored NFT.
public fun get_prize_nft_type(prize: &PrizeInfo): TypeName {
    prize.nft_type
}

/// Returns the tier of a PrizeInfo.
/// @param prize: The PrizeInfo object.
/// @return: The tier as a byte vector (b"common", b"rare", or b"epic").
public fun get_prize_tier(prize: &PrizeInfo): vector<u8> {
    prize.tier
}

/// Consumes a PrizeInfo to extract and return the stored NFT.
/// @param prize: The PrizeInfo containing the NFT.
/// @return: The NFT of type T.
/// Aborts if the requested type T does not match the stored NFT type.
public fun consume_prize<T: key + store>(prize: PrizeInfo): T {
    // Ignore tier as it's unused
    let PrizeInfo { mut id, nft_type, tier: _ } = prize;
    // Verify the requested type matches the stored NFT type
    assert!(type_name::get<T>() == nft_type, EInvalidNFTType);
    // Remove the NFT from dynamic fields
    let nft: T = df::remove(&mut id, nft_type);
    // Clean up the PrizeInfo UID
    object::delete(id);
    nft
}

/// Initializes the Gacha machine by creating an AdminCap and a shared Machine object.
/// @param ctx: The transaction context.
/// Transfers the AdminCap to the sender and shares the Machine object.
fun init(ctx: &mut TxContext) {
    // Create and transfer AdminCap to the sender
    let admin_cap = AdminCap { id: object::new(ctx) };
    transfer::public_transfer(admin_cap, tx_context::sender(ctx));

    // Initialize Machine with empty state
    let machine = Machine {
        id: object::new(ctx),
        total_plays: 0,
        total_rewards: 0,
        common_mints: 0,
        rare_mints: 0,
        epic_mints: 0,
        authorized_minter_caps: vec_set::empty(),
        treasury: coin::zero<SUI>(ctx),
        approved_nfts: table::new(ctx),
        approved_nft_list: vector::empty(),
        prize_pool: PrizePool {
            common_prizes: bag::new(ctx),
            rare_prizes: bag::new(ctx),
            epic_prizes: bag::new(ctx),
        },
        common_price: DEFAULT_COMMON_PRICE,
        rare_price: DEFAULT_RARE_PRICE,
        epic_price: DEFAULT_EPIC_PRICE,
    };
    // Share the Machine for public access
    transfer::public_share_object(machine);
}

/// Sets up the machine for testing by creating an AdminCap and a shared Machine.
/// @param ctx: The transaction context.
#[test_only]
public fun setup(ctx: &mut TxContext) {
    // Create and transfer AdminCap to the sender
    let admin_cap = AdminCap { id: object::new(ctx) };
    transfer::public_transfer(admin_cap, tx_context::sender(ctx));

    // Initialize Machine with empty state
    let machine = Machine {
        id: object::new(ctx),
        total_plays: 0,
        total_rewards: 0,
        common_mints: 0,
        rare_mints: 0,
        epic_mints: 0,
        authorized_minter_caps: vec_set::empty(),
        treasury: coin::zero<SUI>(ctx),
        approved_nfts: table::new(ctx),
        approved_nft_list: vector::empty(),
        prize_pool: PrizePool {
            common_prizes: bag::new(ctx),
            rare_prizes: bag::new(ctx),
            epic_prizes: bag::new(ctx),
        },
        common_price: DEFAULT_COMMON_PRICE,
        rare_price: DEFAULT_RARE_PRICE,
        epic_price: DEFAULT_EPIC_PRICE,
    };

    // Share the Machine for public access
    transfer::public_share_object(machine);
}

/// Registers a MinterCap to allow minting Gacha NFTs.
/// @param admin_cap: The AdminCap for authorization.
/// @param minter_cap: The MinterCap to register.
/// @param machine: The Machine to update.
/// @param ctx: The transaction context.
/// @return: The MinterCap (unchanged).
/// Emits a MinterCapRegisteredEvent.
public fun register_minter_cap(
    _admin_cap: &AdminCap,
    minter_cap: MinterCap,
    machine: &mut Machine,
    ctx: &mut TxContext
): MinterCap {
    // Get the MinterCap ID
    let id = gacha_nft::get_minter_cap_id(&minter_cap);
    // Add to authorized MinterCaps
    vec_set::insert(&mut machine.authorized_minter_caps, id);
    // Emit event
    event::emit(MinterCapRegisteredEvent {
        sender: tx_context::sender(ctx),
        minter_cap_id: id,
    });
    minter_cap
}

/// Approves or unapproves an NFT type `T` for donation and prizes.
/// @param admin_cap: The AdminCap for authorization.
/// @param tier: The tier (b"common", b"rare", or b"epic").
/// @param approve: True to approve, false to unapprove.
/// @param machine: The Machine to update.
/// Aborts if the tier is invalid.
/// Emits an NFTApprovedEvent.
public fun approve_nft<T>(
    _admin_cap: &AdminCap,
    tier: vector<u8>,
    approve: bool,
    machine: &mut Machine
) {
    let nft_type = type_name::get<T>();

    // Validate tier
    assert!(tier == b"common" || tier == b"rare" || tier == b"epic", EInvalidTier);

    // Add or remove from table and list
    if (approve) {
        table::add(&mut machine.approved_nfts, nft_type, tier);
        vector::push_back(&mut machine.approved_nft_list, nft_type);
    } else {
        table::remove(&mut machine.approved_nfts, nft_type);
        let mut i = 0;
        let len = vector::length(&machine.approved_nft_list);
        while (i < len) {
            if (vector::borrow(&machine.approved_nft_list, i) == &nft_type) {
                vector::remove(&mut machine.approved_nft_list, i);
                break
            };
            i = i + 1;
        };
    };

    // Emit event
    event::emit(NFTApprovedEvent {
        nft_type,
        tier,
        approved: approve,
    });
}

/// Adds an NFT to the prize pool as a prize.
/// @param admin_cap: The AdminCap for authorization.
/// @param nft: The NFT to add.
/// @param nft_type: The TypeName of the NFT.
/// @param tier: The tier (b"common", b"rare", or b"epic").
/// @param machine: The Machine to update.
/// @param ctx: The transaction context.
/// Aborts if the tier is invalid, NFT type is not approved, or type mismatches occur.
/// Emits a PrizeAddedEvent.
public fun add_prize<T: key + store>(
    _admin_cap: &AdminCap,
    nft: T,
    nft_type: TypeName,
    tier: vector<u8>,
    machine: &mut Machine,
    ctx: &mut TxContext
) {
    // Validate inputs
    assert!(tier == b"common" || tier == b"rare" || tier == b"epic", EInvalidTier);
    assert!(table::contains(&machine.approved_nfts, nft_type), ENFTNotApproved);
    assert!(*table::borrow(&machine.approved_nfts, nft_type) == tier, EInvalidTier);
    assert!(type_name::get<T>() == nft_type, EInvalidNFTType);

    // Create PrizeInfo to store the NFT
    let mut prize = PrizeInfo {
        id: object::new(ctx),
        nft_type,
        tier,
    };
    let nft_id = object::id(&nft);
    df::add(&mut prize.id, nft_id, nft);

    // Add to the appropriate prize pool
    let bag = match (tier) {
        b"common" => &mut machine.prize_pool.common_prizes,
        b"rare" => &mut machine.prize_pool.rare_prizes,
        b"epic" => &mut machine.prize_pool.epic_prizes,
        _ => abort EInvalidTier
    };
    let index = bag::length(bag);
    bag::add(bag, index, prize);

    // Emit event
    event::emit(PrizeAddedEvent {
        sender: tx_context::sender(ctx),
        nft_type,
        tier,
    });
}

/// Donates an NFT to receive a Common Gacha NFT.
/// @param machine: The Machine to update.
/// @param nft: The NFT to donate.
/// @param nft_type: The TypeName of the donated NFT.
/// @param ctx: The transaction context.
/// @return: A new CommonGachaNFT.
/// Aborts if NFT type is not approved or tier is not common.
/// Emits a DonateEvent.
public fun donate_nft_common<T: key + store>(
    machine: &mut Machine,
    nft: T,
    ctx: &mut TxContext
): CommonGachaNFT {
    let nft_type = type_name::get<T>();
    assert!(table::contains(&machine.approved_nfts, nft_type), ENFTNotApproved);
    let tier = *table::borrow(&machine.approved_nfts, nft_type);
    assert!(tier == b"common", EInvalidTier);

    let mut prize = PrizeInfo {
        id: object::new(ctx),
        nft_type,
        tier,
    };

    let nft_id = object::id(&nft);
    df::add(&mut prize.id, nft_id, nft);

    let bag = &mut machine.prize_pool.common_prizes;
    let index = bag::length(bag);
    bag::add(bag, index, prize);

    let gacha_nft = gacha_nft::mint_common(ctx);
    event::emit(DonateEvent {
        sender: tx_context::sender(ctx),
        donated_nft_type: nft_type,
        gacha_nft_type: type_name::get<CommonGachaNFT>(),
        tier,
    });

    gacha_nft
}

/// Donates an NFT to receive a Rare Gacha NFT.
/// @param machine: The Machine to update.
/// @param nft: The NFT to donate.
/// @param nft_type: The TypeName of the donated NFT.
/// @param ctx: The transaction context.
/// @return: A new RareGachaNFT.
/// Aborts if NFT type is not approved or tier is not rare.
/// Emits a DonateEvent.
public fun donate_nft_rare<T: key + store>(
    machine: &mut Machine,
    nft: T,
    ctx: &mut TxContext
): RareGachaNFT {
    let nft_type = type_name::get<T>();
    assert!(table::contains(&machine.approved_nfts, nft_type), ENFTNotApproved);
    let tier = *table::borrow(&machine.approved_nfts, nft_type);
    assert!(tier == b"rare", EInvalidTier);

    let mut prize = PrizeInfo {
        id: object::new(ctx),
        nft_type,
        tier,
    };

    let nft_id = object::id(&nft);
    df::add(&mut prize.id, nft_id, nft);

    let bag = &mut machine.prize_pool.rare_prizes;
    let index = bag::length(bag);
    bag::add(bag, index, prize);

    let gacha_nft = gacha_nft::mint_rare(ctx);
    event::emit(DonateEvent {
        sender: tx_context::sender(ctx),
        donated_nft_type: nft_type,
        gacha_nft_type: type_name::get<RareGachaNFT>(),
        tier,
    });

    gacha_nft
}



/// Donates an NFT to receive an Epic Gacha NFT.
/// @param machine: The Machine to update.
/// @param nft: The NFT to donate.
/// @param nft_type: The TypeName of the donated NFT.
/// @param ctx: The transaction context.
/// @return: A new EpicGachaNFT.
/// Aborts if NFT type is not approved or tier is not epic.
/// Emits a DonateEvent.
public fun donate_nft_epic<T: key + store>(
    machine: &mut Machine,
    nft: T,
    ctx: &mut TxContext
): EpicGachaNFT {
    let nft_type = type_name::get<T>();
    assert!(table::contains(&machine.approved_nfts, nft_type), ENFTNotApproved);
    let tier = *table::borrow(&machine.approved_nfts, nft_type);
    assert!(tier == b"epic", EInvalidTier);

    let mut prize = PrizeInfo {
        id: object::new(ctx),
        nft_type,
        tier,
    };

    let nft_id = object::id(&nft);
    df::add(&mut prize.id, nft_id, nft);

    let bag = &mut machine.prize_pool.epic_prizes;
    let index = bag::length(bag);
    bag::add(bag, index, prize);

    let gacha_nft = gacha_nft::mint_epic(ctx);
    event::emit(DonateEvent {
        sender: tx_context::sender(ctx),
        donated_nft_type: nft_type,
        gacha_nft_type: type_name::get<EpicGachaNFT>(),
        tier,
    });

    gacha_nft
}


/// Mints a Common Gacha NFT by paying the required SUI.
/// @param machine: The Machine to update.
/// @param payment: The SUI payment (must be >= common_price).
/// @param ctx: The transaction context.
/// @return: A new CommonGachaNFT.
/// Aborts if payment is insufficient.
/// Emits a MintEvent.
public fun mint_common(
    machine: &mut Machine,
    payment: Coin<SUI>,
    ctx: &mut TxContext
): CommonGachaNFT {
    // Validate inputs
    assert!(coin::value(&payment) >= machine.common_price, EInsufficientPayment);

    // Update machine state
    machine.total_plays = machine.total_plays + 1;
    machine.total_rewards = machine.total_rewards + 1;
    machine.common_mints = machine.common_mints + 1;
    coin::join(&mut machine.treasury, payment);

    // Mint NFT
    let nft = gacha_nft::mint_common(ctx);

    // Emit event
    event::emit(MintEvent {
        sender: tx_context::sender(ctx),
        tier: b"common",
        amount: machine.common_price,
        nft_type: type_name::get<CommonGachaNFT>(),
    });

    nft
}

/// Mints a Rare Gacha NFT by paying the required SUI.
/// @param machine: The Machine to update.
/// @param payment: The SUI payment (must be >= rare_price).
/// @param ctx: The transaction context.
/// @return: A new RareGachaNFT.
/// Aborts if payment is insufficient.
/// Emits a MintEvent.
public fun mint_rare(
    machine: &mut Machine,
    payment: Coin<SUI>,
    ctx: &mut TxContext
): RareGachaNFT {
    // Validate inputs
    assert!(coin::value(&payment) >= machine.rare_price, EInsufficientPayment);

    // Update machine state
    machine.total_plays = machine.total_plays + 1;
    machine.total_rewards = machine.total_rewards + 2;
    machine.rare_mints = machine.rare_mints + 1;
    coin::join(&mut machine.treasury, payment);

    // Mint NFT
    let nft = gacha_nft::mint_rare(ctx);

    // Emit event
    event::emit(MintEvent {
        sender: tx_context::sender(ctx),
        tier: b"rare",
        amount: machine.rare_price,
        nft_type: type_name::get<RareGachaNFT>(),
    });

    nft
}

/// Mints an Epic Gacha NFT by paying the required SUI.
/// @param machine: The Machine to update.
/// @param payment: The SUI payment (must be >= epic_price).
/// @param ctx: The transaction context.
/// @return: A new EpicGachaNFT.
/// Aborts if payment is insufficient.
/// Emits a MintEvent.
public fun mint_epic(
    machine: &mut Machine,
    payment: Coin<SUI>,
    ctx: &mut TxContext
): EpicGachaNFT {
    // Validate inputs
    assert!(coin::value(&payment) >= machine.epic_price, EInsufficientPayment);

    // Update machine state
    machine.total_plays = machine.total_plays + 1;
    machine.total_rewards = machine.total_rewards + 3;
    machine.epic_mints = machine.epic_mints + 1;
    coin::join(&mut machine.treasury, payment);

    // Mint NFT
    let nft = gacha_nft::mint_epic(ctx);

    // Emit event
    event::emit(MintEvent {
        sender: tx_context::sender(ctx),
        tier: b"epic",
        amount: machine.epic_price,
        nft_type: type_name::get<EpicGachaNFT>(),
    });

    nft
}

/// Private helper function to select a random prize from a prize pool.
/// @param prize_pool: The Bag containing the prizes.
/// @param random: The Random shared object for secure randomness.
/// @param ctx: The transaction context.
/// @return: A PrizeInfo containing a random prize.
/// Aborts if no prizes are available.
fun select_random_prize(
    prize_pool: &mut Bag,
    random: &Random,
    ctx: &mut TxContext
): PrizeInfo {
    let prize_count = bag::length(prize_pool);
    assert!(prize_count > 0, ENoPrizesAvailable);
    let mut generator = random::new_generator(random, ctx);
    let index = random::generate_u64_in_range(&mut generator, 0, prize_count - 1);
    bag::remove(prize_pool, index)
}

#[test_only]
public fun select_random_prize_test(
    prize_pool: &mut Bag,
    ctx: &mut TxContext
): PrizeInfo {
    let prize_count = bag::length(prize_pool);
    assert!(prize_count > 0, ENoPrizesAvailable);
    let index = tx_context::epoch(ctx) % prize_count;
    bag::remove(prize_pool, index)
}

/// Trades a Common Gacha NFT for a random prize from the common prize pool.
/// @param machine: The Machine to update.
/// @param nft: The CommonGachaNFT to trade.
/// @param random: The Random shared object for secure randomness.
/// @param ctx: The transaction context.
/// @return: A PrizeInfo containing a random common-tier NFT.
/// Aborts if no prizes are available or the prize tier is invalid.
/// Emits a TradeEvent.
#[allow(lint(public_random))]
public fun trade_common(
    machine: &mut Machine,
    nft: CommonGachaNFT,
    random: &Random,
    ctx: &mut TxContext
): PrizeInfo {
    let id = gacha_nft::burn_common(nft);
    object::delete(id);

    let prize = select_random_prize(&mut machine.prize_pool.common_prizes, random, ctx);

    let PrizeInfo { id: _, nft_type, tier } = &prize;
    assert!(*tier == b"common", EInvalidTier);

    event::emit(TradeEvent {
        sender: tx_context::sender(ctx),
        traded_nft_type: type_name::get<CommonGachaNFT>(),
        prize_nft_type: *nft_type,
        tier: *tier,
    });

    prize
}

/// Trades a Rare Gacha NFT for a random prize from the rare prize pool.
/// @param machine: The Machine to update.
/// @param nft: The RareGachaNFT to trade.
/// @param random: The Random shared object for secure randomness.
/// @param ctx: The transaction context.
/// @return: A PrizeInfo containing a random rare-tier NFT.
/// Aborts if no prizes are available or the prize tier is invalid.
/// Emits a TradeEvent.
#[allow(lint(public_random))]
public fun trade_rare(
    machine: &mut Machine,
    nft: RareGachaNFT,
    random: &Random,
    ctx: &mut TxContext
): PrizeInfo {
    let id = gacha_nft::burn_rare(nft);
    object::delete(id);

    let prize = select_random_prize(&mut machine.prize_pool.rare_prizes, random, ctx);

    let PrizeInfo { id: _, nft_type, tier } = &prize;
    assert!(*tier == b"rare", EInvalidTier);

    event::emit(TradeEvent {
        sender: tx_context::sender(ctx),
        traded_nft_type: type_name::get<RareGachaNFT>(),
        prize_nft_type: *nft_type,
        tier: *tier,
    });

    prize
}

/// Trades an Epic Gacha NFT for a random prize from the epic prize pool.
/// @param machine: The Machine to update.
/// @param nft: The EpicGachaNFT to trade.
/// @param random: The Random shared object for secure randomness.
/// @param ctx: The transaction context.
/// @return: A PrizeInfo containing a random epic-tier NFT.
/// Aborts if no prizes are available or the prize tier is invalid.
/// Emits a TradeEvent.
#[allow(lint(public_random))]
public fun trade_epic(
    machine: &mut Machine,
    nft: EpicGachaNFT,
    random: &Random,
    ctx: &mut TxContext
): PrizeInfo {
    let id = gacha_nft::burn_epic(nft);
    object::delete(id);

    let prize = select_random_prize(&mut machine.prize_pool.epic_prizes, random, ctx);

    let PrizeInfo { id: _, nft_type, tier } = &prize;
    assert!(*tier == b"epic", EInvalidTier);

    event::emit(TradeEvent {
        sender: tx_context::sender(ctx),
        traded_nft_type: type_name::get<EpicGachaNFT>(),
        prize_nft_type: *nft_type,
        tier: *tier,
    });

    prize
}


/// Withdraws SUI from the treasury (admin only).
/// @param admin_cap: The AdminCap for authorization.
/// @param machine: The Machine to update.
/// @param amount: The amount to withdraw (in MIST).
/// @param ctx: The transaction context.
/// @return: The withdrawn Coin<SUI>.
/// Aborts if the treasury has insufficient funds.
/// Emits a WithdrawEvent.
public fun withdraw(
    _admin_cap: &AdminCap,
    machine: &mut Machine,
    amount: u64,
    ctx: &mut TxContext
): Coin<SUI> {
    // Validate treasury balance
    assert!(coin::value(&machine.treasury) >= amount, EInsufficientTreasury);
    // Split and return the requested amount
    let coin = coin::split(&mut machine.treasury, amount, ctx);

    // Emit event
    event::emit(WithdrawEvent {
        sender: tx_context::sender(ctx),
        amount,
    });

    coin
}

/// Returns the current treasury balance.
/// @param machine: The Machine object.
/// @return: The treasury value in MIST.
public fun get_treasury_value(machine: &Machine): u64 {
    coin::value(&machine.treasury)
}

/// Returns the total number of mints performed.
/// @param machine: The Machine object.
/// @return: The total plays.
public fun get_total_plays(machine: &Machine): u64 {
    machine.total_plays
}

/// Returns the total reward points accumulated.
/// @param machine: The Machine object.
/// @return: The total rewards.
public fun get_total_rewards(machine: &Machine): u64 {
    machine.total_rewards
}

/// Returns the number of prizes in a given tier.
/// @param machine: The Machine object.
/// @param tier: The tier (b"common", b"rare", or b"epic").
/// @return: The number of prizes.
/// Aborts if the tier is invalid.
public fun get_prize_count(machine: &Machine, tier: vector<u8>): u64 {
    match (tier) {
        b"common" => bag::length(&machine.prize_pool.common_prizes),
        b"rare" => bag::length(&machine.prize_pool.rare_prizes),
        b"epic" => bag::length(&machine.prize_pool.epic_prizes),
        _ => abort EInvalidTier
    }
}

/// Returns the list of all approved NFT types.
/// @param machine: The Machine object.
/// @return: A vector of TypeName containing all approved NFT types.
public fun get_approved_nft_list(machine: &Machine): vector<TypeName> {
    machine.approved_nft_list
}

/// Updates the prices for minting NFTs (admin only).
/// @param admin_cap: The AdminCap for authorization.
/// @param machine: The Machine to update.
/// @param common_price: New price for common NFTs in MIST.
/// @param rare_price: New price for rare NFTs in MIST.
/// @param epic_price: New price for epic NFTs in MIST.
/// Emits a PricesUpdatedEvent.
public fun update_prices(
    _admin_cap: &AdminCap,
    machine: &mut Machine,
    common_price: u64,
    rare_price: u64,
    epic_price: u64,
) {
    // Validate prices
    assert!(common_price > 0 && rare_price > 0 && epic_price > 0, EInvalidPrice);

    machine.common_price = common_price;
    machine.rare_price = rare_price;
    machine.epic_price = epic_price;

    // Emit event
    event::emit(PricesUpdatedEvent {
        common_price,
        rare_price,
        epic_price,
    });
}

/// Returns the current price for common NFTs.
/// @param machine: The Machine object.
/// @return: The price in MIST.
public fun get_common_price(machine: &Machine): u64 {
    machine.common_price
}

/// Returns the current price for rare NFTs.
/// @param machine: The Machine object.
/// @return: The price in MIST.
public fun get_rare_price(machine: &Machine): u64 {
    machine.rare_price
}

/// Returns the current price for epic NFTs.
/// @param machine: The Machine object.
/// @return: The price in MIST.
public fun get_epic_price(machine: &Machine): u64 {
    machine.epic_price
}

/// Returns the number of common NFTs minted.
/// @param machine: The Machine object.
/// @return: The number of common NFTs minted.
public fun get_common_mints(machine: &Machine): u64 {
    machine.common_mints
}

/// Returns the number of rare NFTs minted.
/// @param machine: The Machine object.
/// @return: The number of rare NFTs minted.
public fun get_rare_mints(machine: &Machine): u64 {
    machine.rare_mints
}

/// Returns the number of epic NFTs minted.
/// @param machine: The Machine object.
/// @return: The number of epic NFTs minted.
public fun get_epic_mints(machine: &Machine): u64 {
    machine.epic_mints
}
}
