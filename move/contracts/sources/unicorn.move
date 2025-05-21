/// Module: unicorn
/// Implements a simple NFT collection for Unicorn NFTs that can be minted by anyone.
module gacha::unicorn {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::url::{Self, Url};
    use sui::event;
    use std::string::{Self, String};

    /// The Unicorn NFT type
    public struct Unicorn has key, store {
        id: UID,
        /// Name for the token
        name: String,
        /// Description of the token
        description: String,
        /// URL for the token
        url: Url,
    }

    /// Event emitted when a new Unicorn NFT is minted
    public struct UnicornMinted has copy, drop {
        /// The Object ID of the NFT
        object_id: ID,
        /// The creator of the NFT
        creator: address,
        /// The name of the NFT
        name: String,
    }

    /// Get the name of a Unicorn NFT
    public fun name(nft: &Unicorn): &String {
        &nft.name
    }

    /// Get the description of a Unicorn NFT
    public fun description(nft: &Unicorn): &String {
        &nft.description
    }

    /// Get the URL of a Unicorn NFT
    public fun url(nft: &Unicorn): &Url {
        &nft.url
    }

    /// Create a new Unicorn NFT with fixed properties
    public fun mint(ctx: &mut TxContext): Unicorn {
        let sender = tx_context::sender(ctx);
        let nft = Unicorn {
            id: object::new(ctx),
            name: string::utf8(b"Unicorn NFT"),
            description: string::utf8(b"A magical Unicorn NFT from the Gacha collection"),
            url: url::new_unsafe_from_bytes(b"https://gachapon.club/unicorn.png"),
        };

        event::emit(UnicornMinted {
            object_id: object::id(&nft),
            creator: sender,
            name: nft.name,
        });

        nft
    }

    /// Transfer `nft` to `recipient`
    public fun transfer(nft: Unicorn, recipient: address, _: &mut TxContext) {
        transfer::public_transfer(nft, recipient)
    }

    /// Update the `description` of `nft` to `new_description`
    public fun update_description(
        nft: &mut Unicorn,
        new_description: vector<u8>,
        _: &mut TxContext,
    ) {
        nft.description = string::utf8(new_description)
    }

    /// Permanently delete `nft`
    public fun burn(nft: Unicorn, _: &mut TxContext) {
        let Unicorn { id, name: _, description: _, url: _ } = nft;
        object::delete(id)
    }
} 