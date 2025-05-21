#[test_only]
#[allow(unused_use)]
module gacha::gacha_nft_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use std::string::{Self, String};
    use gacha::gacha_nft::{Self, CommonGachaNFT, RareGachaNFT, EpicGachaNFT};

    const USER: address = @0xB0B;

    const EInvalidNFTName: u64 = 101;
    const EInvalidNFTImage: u64 = 102;

    /// Initialize the test scenario and gacha_nft module
    fun init_test(): Scenario {
        let mut scenario = ts::begin(USER);
        ts::next_tx(&mut scenario, USER);
        {
            gacha_nft::setup(ts::ctx(&mut scenario));
        };
        scenario
    }

    /// Test minting a Common NFT
    #[test]
    fun test_mint_common() {
        let mut scenario = init_test();
        let ts = &mut scenario;

        // User mints a Common NFT
        ts::next_tx(ts, USER);
        {
            let nft = gacha_nft::mint_common(ts::ctx(ts));
            assert!(*gacha_nft::get_common_name(&nft) == string::utf8(b"Common Gacha"), EInvalidNFTName);
            assert!(*gacha_nft::get_common_image_url(&nft) == string::utf8(b"https://gachapon.club/common.gif"), EInvalidNFTImage);
            transfer::public_transfer(nft, USER);
        };

        ts::end(scenario);
    }

    /// Test minting a Rare NFT
    #[test]
    fun test_mint_rare() {
        let mut scenario = init_test();
        let ts = &mut scenario;

        // User mints a Rare NFT
        ts::next_tx(ts, USER);
        {
            let nft = gacha_nft::mint_rare(ts::ctx(ts));
            assert!(*gacha_nft::get_rare_name(&nft) == string::utf8(b"Rare Gacha"), EInvalidNFTName);
            assert!(*gacha_nft::get_rare_image_url(&nft) == string::utf8(b"https://gachapon.club/rare.gif"), EInvalidNFTImage);
            transfer::public_transfer(nft, USER);
        };

        ts::end(scenario);
    }

    /// Test minting an Epic NFT
    #[test]
    fun test_mint_epic() {
        let mut scenario = init_test();
        let ts = &mut scenario;

        // User mints an Epic NFT
        ts::next_tx(ts, USER);
        {
            let nft = gacha_nft::mint_epic(ts::ctx(ts));
            assert!(*gacha_nft::get_epic_name(&nft) == string::utf8(b"Epic Gacha"), EInvalidNFTName);
            assert!(*gacha_nft::get_epic_image_url(&nft) == string::utf8(b"https://gachapon.club/epic.gif"), EInvalidNFTImage);
            transfer::public_transfer(nft, USER);
        };

        ts::end(scenario);
    }
}