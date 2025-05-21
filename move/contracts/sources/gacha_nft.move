/// Module: gacha_nft
/// Defines NFT types and minting functionality for the Gacha system.
/// Provides three tiers of NFTs: Common, Rare, and Epic, each with minting functions.
#[allow(unused_use)]
module gacha::gacha_nft {
    use std::string::{Self, String};

    /// Predefined image URLs for each tier
    const COMMON_IMAGE_URL: vector<u8> = b"https://gachapon.club/common.gif";
    const RARE_IMAGE_URL: vector<u8> = b"https://gachapon.club/rare.gif";
    const EPIC_IMAGE_URL: vector<u8> = b"https://gachapon.club/epic.gif";

    /// Predefined names for each tier
    const COMMON_NAME: vector<u8> = b"Common Gacha";
    const RARE_NAME: vector<u8> = b"Rare Gacha";
    const EPIC_NAME: vector<u8> = b"Epic Gacha";

    /// Predefined descriptions for each tier
    const COMMON_DESCRIPTION: vector<u8> = b"A common tier NFT from the Gacha collection";
    const RARE_DESCRIPTION: vector<u8> = b"A rare tier NFT from the Gacha collection";
    const EPIC_DESCRIPTION: vector<u8> = b"An epic tier NFT from the Gacha collection";

    /// Collection name for all NFTs
    const COLLECTION_NAME: vector<u8> = b"Gacha Collection";

    /// Capability to mint NFTs
    public struct MinterCap has key, store {
        id: UID
    }

    /// Common NFT: Basic tier, tradeable
    public struct CommonGachaNFT has key, store {
        id: UID,
        name: String,
        description: String,
        image_url: String,
        collection: String
    }

    /// Rare NFT: Middle tier, tradeable
    public struct RareGachaNFT has key, store {
        id: UID,
        name: String,
        description: String,
        image_url: String,
        collection: String
    }

    /// Epic NFT: Highest tier, tradeable
    public struct EpicGachaNFT has key, store {
        id: UID,
        name: String,
        description: String,
        image_url: String,
        collection: String
    }

    /// Initialize the module: Create and share the initial MinterCap
    fun init(ctx: &mut TxContext) {
        let minter_cap = MinterCap { id: object::new(ctx) };
        transfer::public_transfer(minter_cap, tx_context::sender(ctx));
    }

    /// Setup function for tests to initialize the module
    #[test_only]
    public fun setup(ctx: &mut TxContext) {
        let minter_cap = MinterCap { id: object::new(ctx) };
        transfer::public_transfer(minter_cap, tx_context::sender(ctx));
    }

    /// Create a new MinterCap (admin action)
    public fun create_minter_cap(ctx: &mut TxContext): MinterCap {
        MinterCap { id: object::new(ctx) }
    }

    /// Mint a Common NFT
    public fun mint_common(ctx: &mut TxContext): CommonGachaNFT {
        CommonGachaNFT {
            id: object::new(ctx),
            name: string::utf8(COMMON_NAME),
            description: string::utf8(COMMON_DESCRIPTION),
            image_url: string::utf8(COMMON_IMAGE_URL),
            collection: string::utf8(COLLECTION_NAME)
        }
    }

    /// Mint a Rare NFT
    public fun mint_rare(ctx: &mut TxContext): RareGachaNFT {
        RareGachaNFT {
            id: object::new(ctx),
            name: string::utf8(RARE_NAME),
            description: string::utf8(RARE_DESCRIPTION),
            image_url: string::utf8(RARE_IMAGE_URL),
            collection: string::utf8(COLLECTION_NAME)
        }
    }

    /// Mint an Epic NFT
    public fun mint_epic(ctx: &mut TxContext): EpicGachaNFT {
        EpicGachaNFT {
            id: object::new(ctx),
            name: string::utf8(EPIC_NAME),
            description: string::utf8(EPIC_DESCRIPTION),
            image_url: string::utf8(EPIC_IMAGE_URL),
            collection: string::utf8(COLLECTION_NAME)
        }
    }

    /// Accessor for MinterCap ID
    public fun get_minter_cap_id(minter_cap: &MinterCap): ID {
        object::uid_to_inner(&minter_cap.id)
    }

    /// Accessor for CommonGachaNFT name
    public fun get_common_name(nft: &CommonGachaNFT): &String {
        &nft.name
    }

    /// Accessor for CommonGachaNFT description
    public fun get_common_description(nft: &CommonGachaNFT): &String {
        &nft.description
    }

    /// Accessor for CommonGachaNFT image_url
    public fun get_common_image_url(nft: &CommonGachaNFT): &String {
        &nft.image_url
    }

    /// Accessor for CommonGachaNFT collection
    public fun get_common_collection(nft: &CommonGachaNFT): &String {
        &nft.collection
    }

    /// Accessor for RareGachaNFT name
    public fun get_rare_name(nft: &RareGachaNFT): &String {
        &nft.name
    }

    /// Accessor for RareGachaNFT description
    public fun get_rare_description(nft: &RareGachaNFT): &String {
        &nft.description
    }

    /// Accessor for RareGachaNFT image_url
    public fun get_rare_image_url(nft: &RareGachaNFT): &String {
        &nft.image_url
    }

    /// Accessor for RareGachaNFT collection
    public fun get_rare_collection(nft: &RareGachaNFT): &String {
        &nft.collection
    }

    /// Accessor for EpicGachaNFT name
    public fun get_epic_name(nft: &EpicGachaNFT): &String {
        &nft.name
    }

    /// Accessor for EpicGachaNFT description
    public fun get_epic_description(nft: &EpicGachaNFT): &String {
        &nft.description
    }

    /// Accessor for EpicGachaNFT image_url
    public fun get_epic_image_url(nft: &EpicGachaNFT): &String {
        &nft.image_url
    }

    /// Accessor for EpicGachaNFT collection
    public fun get_epic_collection(nft: &EpicGachaNFT): &String {
        &nft.collection
    }

    /// Burn a CommonGachaNFT
    public fun burn_common(nft: CommonGachaNFT): UID {
        let CommonGachaNFT { id, name: _, description: _, image_url: _, collection: _ } = nft;
        id
    }

    /// Burn a RareGachaNFT
    public fun burn_rare(nft: RareGachaNFT): UID {
        let RareGachaNFT { id, name: _, description: _, image_url: _, collection: _ } = nft;
        id
    }

    /// Burn an EpicGachaNFT
    public fun burn_epic(nft: EpicGachaNFT): UID {
        let EpicGachaNFT { id, name: _, description: _, image_url: _, collection: _ } = nft;
        id
    }
}