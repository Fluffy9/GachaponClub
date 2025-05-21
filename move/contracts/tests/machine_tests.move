#[test_only]
#[allow(unused_use)]
module gacha::machine_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::sui::SUI;
    use sui::coin::{Self, Coin};
    use std::type_name::{Self, TypeName};
    use sui::dynamic_field as df;
    use std::string::{Self, String};
    use sui::vec_set::{Self, VecSet};
    use sui::table::{Self, Table};
    use sui::bag::{Self, Bag};
    // DO NOT ADD, IT'S ALREADY AVAILABLE BY DEFAULT
    // use sui::object::UID;
    use gacha::machine::{Self, Machine, AdminCap, PrizeInfo, DEFAULT_COMMON_PRICE, DEFAULT_RARE_PRICE, DEFAULT_EPIC_PRICE};
    use gacha::gacha_nft::{Self, CommonGachaNFT, RareGachaNFT, EpicGachaNFT, MinterCap};
    use sui::test_utils::assert_eq;
    // DO NOT ADD, IT'S ALREADY AVAILABLE BY DEFAULT
    // use sui::tx_context::{Self, TxContext};
    use sui::object::{Self, ID};

    const ADMIN: address = @0xAD;
    const USER: address = @0xB0B;

    const EInvalidTreasury: u64 = 100;
    const EInvalidNFTName: u64 = 101;
    const EInvalidPrizeCount: u64 = 102;
    const EInvalidNFTType: u64 = 103;
    const EInvalidTier: u64 = 104;

    /// Mock NFT type for testing new NFTs
    public struct NewNFT has key, store {
        id: UID,
        name: String,
    }

    fun mint_new_nft(name: String, ctx: &mut TxContext): NewNFT {
        NewNFT {
            id: object::new(ctx),
            name,
        }
    }

    fun init_test(): Scenario {
        let mut scenario = ts::begin(ADMIN);
        // Initialize both modules
        ts::next_tx(&mut scenario, ADMIN);
        {
            gacha_nft::setup(ts::ctx(&mut scenario));
            machine::setup(ts::ctx(&mut scenario));
        };
        scenario
    }

    #[test]
    fun test_mint_common() {
        let mut scenario = init_test();
        let ts = &mut scenario;

        // User mints a Common NFT
        ts::next_tx(ts, USER);
        {
            let mut machine = ts::take_shared<Machine>(ts);
            let payment = coin::mint_for_testing<SUI>(1_000_000_000, ts::ctx(ts)); // 1 SUI
            let nft = machine::mint_common(
                &mut machine,
                payment,
                ts::ctx(ts)
            );
            assert!(*gacha_nft::get_common_name(&nft) == string::utf8(b"Common Gacha"), EInvalidNFTName);
            assert!(machine::get_treasury_value(&machine) == 1_000_000_000, EInvalidTreasury);
            assert!(machine::get_total_plays(&machine) == 1, 0);
            assert!(machine::get_total_rewards(&machine) == 1, 0);
            transfer::public_transfer(nft, USER);
            ts::return_shared(machine);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_mint_rare() {
        let mut scenario = init_test();
        let ts = &mut scenario;

        // User mints a Rare NFT
        ts::next_tx(ts, USER);
        {
            let mut machine = ts::take_shared<Machine>(ts);
            let payment = coin::mint_for_testing<SUI>(5_000_000_000, ts::ctx(ts)); // 5 SUI
            let nft = machine::mint_rare(
                &mut machine,
                payment,
                ts::ctx(ts)
            );
            assert!(*gacha_nft::get_rare_name(&nft) == string::utf8(b"Rare Gacha"), EInvalidNFTName);
            assert!(machine::get_treasury_value(&machine) == 5_000_000_000, EInvalidTreasury);
            assert!(machine::get_total_plays(&machine) == 1, 0);
            assert!(machine::get_total_rewards(&machine) == 2, 0);
            transfer::public_transfer(nft, USER);
            ts::return_shared(machine);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_mint_epic() {
        let mut scenario = init_test();
        let ts = &mut scenario;

        // User mints an Epic NFT
        ts::next_tx(ts, USER);
        {
            let mut machine = ts::take_shared<Machine>(ts);
            let payment = coin::mint_for_testing<SUI>(10_000_000_000, ts::ctx(ts)); // 10 SUI
            let nft = machine::mint_epic(
                &mut machine,
                payment,
                ts::ctx(ts)
            );
            assert!(*gacha_nft::get_epic_name(&nft) == string::utf8(b"Epic Gacha"), EInvalidNFTName);
            assert!(machine::get_treasury_value(&machine) == 10_000_000_000, EInvalidTreasury);
            assert!(machine::get_total_plays(&machine) == 1, 0);
            assert!(machine::get_total_rewards(&machine) == 3, 0);
            transfer::public_transfer(nft, USER);
            ts::return_shared(machine);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_withdraw() {
        let mut scenario = init_test();
        let ts = &mut scenario;

        // User mints a Common NFT to add funds to treasury
        ts::next_tx(ts, USER);
        {
            let mut machine = ts::take_shared<Machine>(ts);
            let payment = coin::mint_for_testing<SUI>(1_000_000_000, ts::ctx(ts)); // 1 SUI
            let nft = machine::mint_common(
                &mut machine,
                payment,
                ts::ctx(ts)
            );
            transfer::public_transfer(nft, USER);
            ts::return_shared(machine);
        };

        // Admin withdraws funds
        ts::next_tx(ts, ADMIN);
        {
            let mut machine = ts::take_shared<Machine>(ts);
            let admin_cap = ts::take_from_sender<AdminCap>(ts);
            let withdrawn = machine::withdraw(&admin_cap, &mut machine, 500_000_000, ts::ctx(ts)); // 0.5 SUI
            assert!(coin::value(&withdrawn) == 500_000_000, EInvalidTreasury);
            assert!(machine::get_treasury_value(&machine) == 500_000_000, EInvalidTreasury);
            transfer::public_transfer(withdrawn, ADMIN);
            ts::return_shared(machine);
            ts::return_to_sender(ts, admin_cap);
        };

        ts::end(scenario);
    }

    // #[test]
    // fun test_trade_common() {
    //     let mut scenario = init_test();
    //     let ts = &mut scenario;

    //     // Admin approves CommonGachaNFT for Common tier
    //     ts::next_tx(ts, ADMIN);
    //     {
    //         let mut machine = ts::take_shared<Machine>(ts);
    //         let admin_cap = ts::take_from_sender<AdminCap>(ts);
    //         machine::approve_nft(&admin_cap, type_name::get<CommonGachaNFT>(), b"common", true, &mut machine);
    //         ts::return_shared(machine);
    //         ts::return_to_sender(ts, admin_cap);
    //     };

    //     // Admin adds a prize to the Common prize pool
    //     ts::next_tx(ts, ADMIN);
    //     {
    //         let mut machine = ts::take_shared<Machine>(ts);
    //         let admin_cap = ts::take_from_sender<AdminCap>(ts);
    //         let prize_nft = gacha_nft::mint_common(ts::ctx(ts));
    //         machine::add_prize(
    //             &admin_cap,
    //             prize_nft,
    //             type_name::get<CommonGachaNFT>(),
    //             b"common",
    //             &mut machine,
    //             ts::ctx(ts)
    //         );
    //         assert!(machine::get_prize_count(&machine, b"common") == 1, EInvalidPrizeCount);
    //         ts::return_shared(machine);
    //         ts::return_to_sender(ts, admin_cap);
    //     };

    //     // User mints a Common NFT
    //     ts::next_tx(ts, USER);
    //     {
    //         let mut machine = ts::take_shared<Machine>(ts);
    //         let payment = coin::mint_for_testing<SUI>(1_000_000_000, ts::ctx(ts)); // 1 SUI
    //         let nft = machine::mint_common(
    //             &mut machine,
    //             payment,
    //             ts::ctx(ts)
    //         );
    //         transfer::public_transfer(nft, USER);
    //         ts::return_shared(machine);
    //     };

    //     // User trades the Common NFT for a prize
    //     ts::next_tx(ts, USER);
    //     {
    //         let mut machine = ts::take_shared<Machine>(ts);
    //         let nft = ts::take_from_sender<CommonGachaNFT>(ts);
    //         let prize = machine::trade_common_test(&mut machine, nft, ts::ctx(ts));
    //         let nft_type = machine::get_prize_nft_type(&prize);
    //         let tier = machine::get_prize_tier(&prize);
    //         assert!(tier == b"common", EInvalidTier);
    //         assert!(nft_type == type_name::get<CommonGachaNFT>(), EInvalidNFTType);
    //         assert!(machine::get_prize_count(&machine, b"common") == 0, EInvalidPrizeCount);
    //         let nft: CommonGachaNFT = machine::consume_prize(prize);
    //         assert!(*gacha_nft::get_common_name(&nft) == string::utf8(b"Common Gacha"), EInvalidNFTName);
    //         transfer::public_transfer(nft, USER);
    //         ts::return_shared(machine);
    //     };

    //     ts::end(scenario);
    // }

    #[test]
    fun test_donate_new_nft() {
        let mut scenario = init_test();
        let ts = &mut scenario;

        // Admin approves NewNFT for Rare tier
        ts::next_tx(ts, ADMIN);
        {
            let mut machine = ts::take_shared<Machine>(ts);
            let admin_cap = ts::take_from_sender<AdminCap>(ts);
            machine::approve_nft<NewNFT>(&admin_cap, b"rare", true, &mut machine);
            ts::return_shared(machine);
            ts::return_to_sender(ts, admin_cap);
        };

        // User mints a NewNFT
        ts::next_tx(ts, USER);
        {
            let nft = mint_new_nft(string::utf8(b"Test NewNFT"), ts::ctx(ts));
            transfer::public_transfer(nft, USER);
        };

        // User donates the NewNFT
        ts::next_tx(ts, USER);
        {
            let mut machine = ts::take_shared<Machine>(ts);
            let nft = ts::take_from_sender<NewNFT>(ts);
            let gacha_nft = machine::donate_nft_rare(&mut machine, nft, ts::ctx(ts));
            assert!(machine::get_prize_count(&machine, b"rare") == 1, EInvalidPrizeCount);
            transfer::public_transfer(gacha_nft, USER);
            ts::return_shared(machine);
        };

        // User receives a RareGachaNFT
        ts::next_tx(ts, USER);
        {
            let nft = ts::take_from_sender<RareGachaNFT>(ts);
            assert!(*gacha_nft::get_rare_name(&nft) == string::utf8(b"Rare Gacha"), EInvalidNFTName);
            transfer::public_transfer(nft, USER);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = gacha::machine::EInsufficientPayment)]
    fun test_insufficient_payment_common() {
        let mut scenario = ts::begin(@0x123);
        let ts = &mut scenario;
        let admin_cap = ts::take_from_address<AdminCap>(ts, @0x123);
        let mut machine = ts::take_shared<Machine>(ts);
        
        // Try to mint with insufficient payment (1 less than required)
        let payment = coin::mint_for_testing<SUI>(10_000_000 - 1, ts::ctx(ts));
        
        // This should fail with EInsufficientPayment
        ts::next_tx(ts, @0x123);
        {
            let nft = machine::mint_common(&mut machine, payment, ts::ctx(ts));
            let id = gacha_nft::burn_common(nft);
            object::delete(id);
        };
        
        ts::return_shared(machine);
        ts::return_to_sender(ts, admin_cap);
        ts::end(scenario);
    }

    // #[test]
    // #[expected_failure(abort_code = gacha::machine::ENoPrizesAvailable)]
    // fun test_trade_common_no_prizes() {
    //     let mut scenario = init_test();
    //     let ts = &mut scenario;

    //     // User mints a Common NFT
    //     ts::next_tx(ts, USER);
    //     {
    //         let mut machine = ts::take_shared<Machine>(ts);
    //         let payment = coin::mint_for_testing<SUI>(1_000_000_000, ts::ctx(ts)); // 1 SUI
    //         let nft = machine::mint_common(
    //             &mut machine,
    //             payment,
    //             ts::ctx(ts)
    //         );
    //         transfer::public_transfer(nft, USER);
    //         ts::return_shared(machine);
    //     };

    //     // User attempts to trade with empty prize pool
    //     ts::next_tx(ts, USER);
    //     {
    //         let mut machine = ts::take_shared<Machine>(ts);
    //         let nft = ts::take_from_sender<CommonGachaNFT>(ts);
    //         let prize = machine::trade_common_test(&mut machine, nft, ts::ctx(ts));
    //         let _nft_type = machine::get_prize_nft_type(&prize);
    //         let _tier = machine::get_prize_tier(&prize);
    //         let nft: CommonGachaNFT = machine::consume_prize(prize);
    //         transfer::public_transfer(nft, USER);
    //         ts::return_shared(machine);
    //     };

    //     ts::end(scenario);
    // }

    #[test]
    #[expected_failure(abort_code = gacha::machine::ENFTNotApproved)]
    fun test_donate_nft_not_approved() {
        let mut scenario = init_test();
        let ts = &mut scenario;

        // User mints a NewNFT
        ts::next_tx(ts, USER);
        {
            let nft = mint_new_nft(string::utf8(b"Test NewNFT"), ts::ctx(ts));
            transfer::public_transfer(nft, USER);
        };

        // User attempts to donate unapproved NFT
        ts::next_tx(ts, USER);
        {
            let mut machine = ts::take_shared<Machine>(ts);
            let nft = ts::take_from_sender<NewNFT>(ts);
            let gacha_nft = machine::donate_nft_rare(&mut machine, nft, ts::ctx(ts));
            transfer::public_transfer(gacha_nft, USER);
            ts::return_shared(machine);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = gacha::machine::EInvalidTier)]
    fun test_approve_nft_invalid_tier() {
        let mut scenario = init_test();
        let ts = &mut scenario;

        // Admin attempts to approve NFT with invalid tier
        ts::next_tx(ts, ADMIN);
        {
            let mut machine = ts::take_shared<Machine>(ts);
            let admin_cap = ts::take_from_sender<AdminCap>(ts);
            machine::approve_nft<NewNFT>(&admin_cap, b"invalid", true, &mut machine);
            ts::return_shared(machine);
            ts::return_to_sender(ts, admin_cap);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_approved_nft_list() {
        let mut scenario = ts::begin(@0x1);
        let admin = @0x1;
        let minter = @0x2;

        // Setup both machine and gacha_nft modules
        ts::next_tx(&mut scenario, admin);
        {
            machine::setup(ts::ctx(&mut scenario));
            gacha_nft::setup(ts::ctx(&mut scenario));
        };

        // Create and transfer minter cap to minter
        ts::next_tx(&mut scenario, admin);
        {
            let minter_cap = gacha_nft::create_minter_cap(ts::ctx(&mut scenario));
            transfer::public_transfer(minter_cap, minter);
        };

        // Register minter cap
        ts::next_tx(&mut scenario, admin);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut machine = ts::take_shared<Machine>(&scenario);
            let minter_cap = ts::take_from_address<MinterCap>(&scenario, minter);
            let minter_cap = machine::register_minter_cap(&admin_cap, minter_cap, &mut machine, ts::ctx(&mut scenario));
            transfer::public_transfer(minter_cap, minter);
            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(machine);
        };

        // Test initial empty list
        ts::next_tx(&mut scenario, admin);
        {
            let machine = ts::take_shared<Machine>(&scenario);
            let approved_list = machine::get_approved_nft_list(&machine);
            assert!(vector::is_empty(&approved_list), 0);
            ts::return_shared(machine);
        };

        // Test adding NFTs to list
        ts::next_tx(&mut scenario, admin);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut machine = ts::take_shared<Machine>(&scenario);
            
            // Approve common NFT
            machine::approve_nft<CommonGachaNFT>(&admin_cap, b"common", true, &mut machine);
            
            // Approve rare NFT
            machine::approve_nft<RareGachaNFT>(&admin_cap, b"rare", true, &mut machine);
            
            // Approve epic NFT
            machine::approve_nft<EpicGachaNFT>(&admin_cap, b"epic", true, &mut machine);
            
            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(machine);
        };

        // Verify NFTs are in list
        ts::next_tx(&mut scenario, admin);
        {
            let machine = ts::take_shared<Machine>(&scenario);
            let approved_list = machine::get_approved_nft_list(&machine);
            assert!(vector::length(&approved_list) == 3, 0);
            assert!(vector::contains(&approved_list, &type_name::get<CommonGachaNFT>()), 0);
            assert!(vector::contains(&approved_list, &type_name::get<RareGachaNFT>()), 0);
            assert!(vector::contains(&approved_list, &type_name::get<EpicGachaNFT>()), 0);
            ts::return_shared(machine);
        };

        // Test removing NFT from list
        ts::next_tx(&mut scenario, admin);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut machine = ts::take_shared<Machine>(&scenario);
            
            // Unapprove rare NFT
            machine::approve_nft<RareGachaNFT>(&admin_cap, b"rare", false, &mut machine);
            
            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(machine);
        };

        // Verify NFT was removed
        ts::next_tx(&mut scenario, admin);
        {
            let machine = ts::take_shared<Machine>(&scenario);
            let approved_list = machine::get_approved_nft_list(&machine);
            assert!(vector::length(&approved_list) == 2, 0);
            assert!(vector::contains(&approved_list, &type_name::get<CommonGachaNFT>()), 0);
            assert!(!vector::contains(&approved_list, &type_name::get<RareGachaNFT>()), 0);
            assert!(vector::contains(&approved_list, &type_name::get<EpicGachaNFT>()), 0);
            ts::return_shared(machine);
        };

        ts::end(scenario);
    }

    // #[test]
    // fun test_update_prices() {
    //     let mut scenario = init_test();
    //     let ts = &mut scenario;

    //     // Admin updates prices
    //     ts::next_tx(ts, ADMIN);
    //     {
    //         let mut machine = ts::take_shared<Machine>(ts);
    //         let admin_cap = ts::take_from_sender<AdminCap>(ts);
            
    //         // Test initial prices
    //         assert_eq(machine::get_common_price(&machine), DEFAULT_COMMON_PRICE);
    //         assert_eq(machine::get_rare_price(&machine), DEFAULT_RARE_PRICE);
    //         assert_eq(machine::get_epic_price(&machine), DEFAULT_EPIC_PRICE);

    //         // Update prices
    //         let new_common_price = 2_000_000_000; // 2 SUI
    //         let new_rare_price = 6_000_000_000;   // 6 SUI
    //         let new_epic_price = 12_000_000_000;  // 12 SUI

    //         machine::update_prices(&admin_cap, &mut machine, new_common_price, new_rare_price, new_epic_price);

    //         // Verify new prices
    //         assert_eq(machine::get_common_price(&machine), new_common_price);
    //         assert_eq(machine::get_rare_price(&machine), new_rare_price);
    //         assert_eq(machine::get_epic_price(&machine), new_epic_price);

    //         ts::return_shared(machine);
    //         ts::return_to_sender(ts, admin_cap);
    //     };

    //     ts::end(scenario);
    // }

    #[test]
    fun test_mint_with_updated_prices() {
        let mut scenario = init_test();
        let ts = &mut scenario;

        // Admin updates prices
        ts::next_tx(ts, ADMIN);
        {
            let mut machine = ts::take_shared<Machine>(ts);
            let admin_cap = ts::take_from_sender<AdminCap>(ts);
            
            // Update prices
            let new_common_price = 2_000_000_000; // 2 SUI
            let new_rare_price = 6_000_000_000;   // 6 SUI
            let new_epic_price = 12_000_000_000;  // 12 SUI

            machine::update_prices(&admin_cap, &mut machine, new_common_price, new_rare_price, new_epic_price);

            // Test minting with new prices
            let payment = coin::mint_for_testing<SUI>(new_common_price, ts::ctx(ts));
            let nft = machine::mint_common(&mut machine, payment, ts::ctx(ts));
            assert!(machine::get_total_plays(&machine) == 1, 0);
            assert!(machine::get_total_rewards(&machine) == 1, 0);
            assert!(machine::get_treasury_value(&machine) == new_common_price, 0);

            // Clean up
            let id = gacha_nft::burn_common(nft);
            object::delete(id);
            ts::return_shared(machine);
            ts::return_to_sender(ts, admin_cap);
        };

        ts::end(scenario);
    }

    // #[test]
    // #[expected_failure(abort_code = machine::EInsufficientPayment, location = machine)]
    // fun test_insufficient_payment() {
    //     let mut scenario = init_test();
    //     let ts = &mut scenario;

    //     // User tries to mint with insufficient payment
    //     ts::next_tx(ts, USER);
    //     {
    //         let mut machine = ts::take_shared<Machine>(ts);
    //         let insufficient_payment = coin::mint_for_testing<SUI>(DEFAULT_COMMON_PRICE - 1, ts::ctx(ts));
    //         let nft = machine::mint_common(&mut machine, insufficient_payment, ts::ctx(ts));
    //         let id = gacha_nft::burn_common(nft);
    //         sui::object::delete(id);
    //         ts::return_shared(machine);
    //     };

    //     ts::end(scenario);
    // }

    // #[test]
    // #[expected_failure(abort_code = machine::EInvalidPrice, location = machine)]
    // fun test_price_update_validation() {
    //     let mut scenario = init_test();
    //     let ts = &mut scenario;

    //     // Admin tries to set prices to 0
    //     ts::next_tx(ts, ADMIN);
    //     {
    //         let mut machine = ts::take_shared<Machine>(ts);
    //         let admin_cap = ts::take_from_sender<AdminCap>(ts);
    //         machine::update_prices(&admin_cap, &mut machine, 0, 0, 0);
    //         ts::return_shared(machine);
    //         ts::return_to_sender(ts, admin_cap);
    //     };

    //     ts::end(scenario);
    // }

    // #[test]
    // fun test_trade_common_with_prize() {
    //     let mut scenario = init_test();
    //     let ts = &mut scenario;

    //     // Admin approves CommonGachaNFT for Common tier
    //     ts::next_tx(ts, ADMIN);
    //     {
    //         let mut machine = ts::take_shared<Machine>(ts);
    //         let admin_cap = ts::take_from_sender<AdminCap>(ts);
    //         machine::approve_nft(&admin_cap, type_name::get<CommonGachaNFT>(), b"common", true, &mut machine);
    //         ts::return_shared(machine);
    //         ts::return_to_sender(ts, admin_cap);
    //     };

    //     // Admin adds a prize to the Common prize pool
    //     ts::next_tx(ts, ADMIN);
    //     {
    //         let mut machine = ts::take_shared<Machine>(ts);
    //         let admin_cap = ts::take_from_sender<AdminCap>(ts);
    //         let prize_nft = gacha_nft::mint_common(ts::ctx(ts));
    //         machine::add_prize(
    //             &admin_cap,
    //             prize_nft,
    //             type_name::get<CommonGachaNFT>(),
    //             b"common",
    //             &mut machine,
    //             ts::ctx(ts)
    //         );
    //         ts::return_shared(machine);
    //         ts::return_to_sender(ts, admin_cap);
    //     };

    //     // User mints and trades a Common NFT
    //     ts::next_tx(ts, USER);
    //     {
    //         let mut machine = ts::take_shared<Machine>(ts);
    //         let payment = coin::mint_for_testing<SUI>(DEFAULT_COMMON_PRICE, ts::ctx(ts));
    //         let nft = machine::mint_common(&mut machine, payment, ts::ctx(ts));
    //         let prize = machine::trade_common_test(&mut machine, nft, ts::ctx(ts));
    //         assert!(machine::get_total_rewards(&machine) == 1, 0);
    //         let prize_id = machine::get_prize_id(&mut prize);
    //         let id = *prize_id;
    //         object::delete(id);
    //         ts::return_shared(machine);
    //     };

    //     ts::end(scenario);
    // }

    // #[test]
    // fun test_trade_rare_with_prize() {
    //     let mut scenario = init_test();
    //     let ts = &mut scenario;

    //     // Admin approves RareGachaNFT for Rare tier
    //     ts::next_tx(ts, ADMIN);
    //     {
    //         let mut machine = ts::take_shared<Machine>(ts);
    //         let admin_cap = ts::take_from_sender<AdminCap>(ts);
    //         machine::approve_nft(&admin_cap, type_name::get<RareGachaNFT>(), b"rare", true, &mut machine);
    //         ts::return_shared(machine);
    //         ts::return_to_sender(ts, admin_cap);
    //     };

    //     // Admin adds a prize to the Rare prize pool
    //     ts::next_tx(ts, ADMIN);
    //     {
    //         let mut machine = ts::take_shared<Machine>(ts);
    //         let admin_cap = ts::take_from_sender<AdminCap>(ts);
    //         let prize_nft = gacha_nft::mint_rare(ts::ctx(ts));
    //         machine::add_prize(
    //             &admin_cap,
    //             prize_nft,
    //             type_name::get<RareGachaNFT>(),
    //             b"rare",
    //             &mut machine,
    //             ts::ctx(ts)
    //         );
    //         ts::return_shared(machine);
    //         ts::return_to_sender(ts, admin_cap);
    //     };

    //     // User mints and trades a Rare NFT
    //     ts::next_tx(ts, USER);
    //     {
    //         let mut machine = ts::take_shared<Machine>(ts);
    //         let payment = coin::mint_for_testing<SUI>(DEFAULT_RARE_PRICE, ts::ctx(ts));
    //         let nft = machine::mint_rare(&mut machine, payment, ts::ctx(ts));
    //         let prize = machine::trade_rare_test(&mut machine, nft, ts::ctx(ts));
    //         assert!(machine::get_total_rewards(&machine) == 2, 0);
    //         let prize_id = machine::get_prize_id(&mut prize);
    //         let id = *prize_id;
    //         object::delete(id);
    //         ts::return_shared(machine);
    //     };

    //     ts::end(scenario);
    // }

    // #[test]
    // fun test_trade_epic() {
    //     let scenario = ts::begin(@0x1);
    //     let admin = @0x1;
    //     ts::next_tx(&mut scenario, admin);
    //     {
    //         let admin_cap = machine::init(ts::ctx(&mut scenario));
    //         let machine = ts::take_shared<Machine>(&scenario);
    //         ts::share_object(&mut scenario, machine);
    //         ts::return_owned(admin_cap);
    //     };

    //     ts::next_tx(&mut scenario, admin);
    //     {
    //         let machine = ts::take_shared<Machine>(&scenario);
    //         let nft = machine::mint_epic(&mut machine, coin::mint_for_testing<SUI>(DEFAULT_EPIC_PRICE, ts::ctx(&mut scenario)), ts::ctx(&mut scenario));
    //         let prize = machine::trade_epic_test(&mut machine, nft, ts::ctx(&mut scenario));
    //         assert!(machine::get_epic_rewards(&machine) == 1, 0);
    //         let id = machine::get_prize_id(&mut prize);
    //         object::delete(id);
    //         ts::return_shared(machine);
    //     };

    //     ts::end(scenario);
    // }
}