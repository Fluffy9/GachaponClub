/// Module: bear
/// Implements a simple NFT collection for Bear NFTs that can be minted by anyone.
module gacha::bear {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::url::{Self, Url};
    use sui::event;
    use std::string::{Self, String};

    /// The Bear NFT type
    public struct Bear has key, store {
        id: UID,
        /// Name for the token
        name: String,
        /// Description of the token
        description: String,
        /// URL for the token
        image_url: Url,
    }

    /// Event emitted when a new Bear NFT is minted
    public struct BearMinted has copy, drop {
        // The Object ID of the NFT
        object_id: ID,
        // The creator of the NFT
        creator: address,
        // The name of the NFT
        name: String,
    }

    /// Get the name of a Bear NFT
    public fun name(nft: &Bear): &String {
        &nft.name
    }

    /// Get the description of a Bear NFT
    public fun description(nft: &Bear): &String {
        &nft.description
    }

    /// Get the URL of a Bear NFT
    public fun url(nft: &Bear): &Url {
        &nft.image_url
    }

    /// Create a new Bear NFT
    public fun mint(ctx: &mut TxContext): Bear {
        let sender = tx_context::sender(ctx);
        let nft = Bear {
            id: object::new(ctx),
            name: string::utf8(b"Bear NFT"),
            description: string::utf8(b"A mighty Bear NFT from the Gacha collection"),
            image_url: url::new_unsafe_from_bytes(b"https://gachapon.club/bear.png"),
        };

        event::emit(BearMinted {
            object_id: object::id(&nft),
            creator: sender,
            name: nft.name,
        });

        nft
    }

    /// Transfer `nft` to `recipient`
    public fun transfer(nft: Bear, recipient: address, _: &mut TxContext) {
        transfer::public_transfer(nft, recipient)
    }

    /// Update the `description` of `nft` to `new_description`
    public fun update_description(
        nft: &mut Bear,
        new_description: vector<u8>,
        _: &mut TxContext,
    ) {
        nft.description = string::utf8(new_description)
    }

    /// Permanently delete `nft`
    public fun burn(nft: Bear, _: &mut TxContext) {
        let Bear { id, name: _, description: _, image_url: _ } = nft;
        object::delete(id)
    }
} 