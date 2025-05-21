/// Module: cat
/// Implements a simple NFT collection for Cat NFTs that can be minted by anyone.
module gacha::cat {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::url::{Self, Url};
    use sui::event;
    use std::string::{Self, String};

    /// The Cat NFT type
    public struct Cat has key, store {
        id: UID,
        /// Name for the token
        name: String,
        /// Description of the token
        description: String,
        /// URL for the token
        image_url: Url,
    }

    /// Event emitted when a new Cat NFT is minted
    public struct CatMinted has copy, drop {
        /// The Object ID of the NFT
        object_id: ID,
        /// The creator of the NFT
        creator: address,
        /// The name of the NFT
        name: String,
    }

    /// Get the name of a Cat NFT
    public fun name(nft: &Cat): &String {
        &nft.name
    }

    /// Get the description of a Cat NFT
    public fun description(nft: &Cat): &String {
        &nft.description
    }

    /// Get the URL of a Cat NFT
    public fun url(nft: &Cat): &Url {
        &nft.image_url
    }

    /// Create a new Cat NFT
    public fun mint(ctx: &mut TxContext): Cat {
        let sender = tx_context::sender(ctx);
        let nft = Cat {
            id: object::new(ctx),
            name: string::utf8(b"Cat NFT"),
            description: string::utf8(b"A cute Cat NFT from the Gacha collection"),
            image_url: url::new_unsafe_from_bytes(b"https://gachapon.club/cat.png"),
        };

        event::emit(CatMinted {
            object_id: object::id(&nft),
            creator: sender,
            name: nft.name,
        });

        nft
    }

    /// Transfer `nft` to `recipient`
    public fun transfer(nft: Cat, recipient: address, _: &mut TxContext) {
        transfer::public_transfer(nft, recipient)
    }

    /// Update the `description` of `nft` to `new_description`
    public fun update_description(
        nft: &mut Cat,
        new_description: vector<u8>,
        _: &mut TxContext,
    ) {
        nft.description = string::utf8(new_description)
    }

    /// Permanently delete `nft`
    public fun burn(nft: Cat, _: &mut TxContext) {
        let Cat { id, name: _, description: _, image_url: _ } = nft;
        object::delete(id)
    }
} 