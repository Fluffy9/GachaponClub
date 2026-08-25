// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./vrf/IVRFCoordinatorV2Plus.sol";
import "./vrf/IVRFSubscriptionV2Plus.sol";
import "./vrf/VRFV2PlusClient.sol";

interface IGachaNFT {
    function mint(address to, uint256 rarityId, uint256 amount) external;
    function burn(address from, uint256 id, uint256 amount) external;
}

/**
 * @title GachaMachine
 * @dev Contract that manages gacha mechanics, rarity configurations, and prize distribution
 */
contract GachaMachine is AccessControl, ERC1155Holder, ReentrancyGuard {
    /// @dev Event emitted when a new rarity is registered
    /// @param rarityId The ID of the new rarity
    /// @param tokenContract The address of the ERC1155 contract for this rarity
    /// @param name The name of the rarity
    /// @param price The price for this rarity
    event RarityRegistered(
        uint256 indexed rarityId,
        address tokenContract,
        string name,
        uint256 price
    );

    /// @dev Event emitted when the price for a rarity is updated
    /// @param rarityId The ID of the rarity
    /// @param price The new price
    event RarityPriceUpdated(uint256 indexed rarityId, uint256 price);

    /// @dev Event emitted when a rarity is enabled or disabled
    /// @param rarityId The ID of the rarity
    /// @param enabled Whether the rarity is enabled or disabled
    event RarityEnabled(uint256 indexed rarityId, bool enabled);

    /// @dev Event emitted when a prize is added to a rarity
    /// @param rarityId The ID of the rarity
    /// @param tokenContract The address of the ERC1155 contract for this prize
    /// @param tokenId The ID of the prize
    /// @param amount The amount of the prize added
    /// @param isERC721 Whether the prize is an ERC721 token
    event PrizeAdded(
        uint256 indexed rarityId,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        bool isERC721
    );

    /// @dev Event emitted when a prize is redeemed
    /// @param rarityId The ID of the rarity
    /// @param tokenContract The address of the ERC1155 contract for this prize
    /// @param tokenId The ID of the prize
    /// @param amount The amount of the prize redeemed
    /// @param isERC721 Whether the prize is an ERC721 token
    /// @param to The address of the recipient
    event PrizeRedeemed(
        uint256 indexed rarityId,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        bool isERC721,
        address to
    );

    /// @dev Event emitted when an NFT is approved for donation
    /// @param rarityId The ID of the rarity
    /// @param tokenContract The address of the NFT contract
    event NFTApproved(uint256 indexed rarityId, address tokenContract);

    /// @dev Event emitted when an NFT is donated
    /// @param rarityId The ID of the rarity
    /// @param tokenContract The address of the NFT contract
    /// @param tokenId The ID of the NFT
    /// @param amount The amount of the donated NFT
    /// @param isERC721 Whether the NFT is an ERC721 token
    /// @param from The address of the donor
    event NFTDonated(
        uint256 indexed rarityId,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        bool isERC721,
        address from
    );

    /// @dev Event emitted when tokens are withdrawn
    /// @param token The address of the token (address(0) for ETH)
    /// @param amount The amount withdrawn
    /// @param to The address the tokens were withdrawn to
    event TokensWithdrawn(address indexed token, uint256 amount, address to);

    /// @dev Event emitted when an NFT withdrawal is scheduled
    /// @param tokenContract The address of the NFT contract
    /// @param tokenId The ID of the NFT
    /// @param amount The amount to withdraw
    /// @param isERC721 Whether the NFT is an ERC721 token
    /// @param to The address to withdraw to
    /// @param withdrawalTime The timestamp when the NFT can be withdrawn
    event NFTWithdrawalScheduled(
        address indexed tokenContract,
        uint256 tokenId,
        uint256 amount,
        bool isERC721,
        address to,
        uint256 withdrawalTime
    );

    /// @dev Event emitted when an NFT withdrawal is executed
    /// @param tokenContract The address of the NFT contract
    /// @param tokenId The ID of the NFT
    /// @param amount The amount withdrawn
    /// @param isERC721 Whether the NFT is an ERC721 token
    /// @param to The address the NFT was withdrawn to
    event NFTWithdrawn(
        address indexed tokenContract,
        uint256 tokenId,
        uint256 amount,
        bool isERC721,
        address to
    );

    /// @dev Event emitted when the admin is changed
    /// @param oldAdmin The address of the old admin
    /// @param newAdmin The address of the new admin
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    /// @dev Event emitted when a user purchases a capsule
    event CapsulePurchased(
        address indexed buyer,
        uint256 indexed rarityId,
        uint256 price,
        uint256 paid
    );

    /// @dev Event emitted when a player burns a capsule and requests a draw
    event PlayRequested(
        uint256 indexed requestId,
        address indexed player,
        uint256 indexed rarityId
    );

    /// @dev Event emitted when VRF assigns a prize to a claim queue
    event PrizeDrawn(
        uint256 indexed requestId,
        address indexed player,
        uint256 indexed rarityId,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        bool isERC721
    );

    /// @dev Event emitted when a player claims a drawn prize (or capsule refund)
    event PrizeClaimed(
        address indexed player,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        bool isERC721
    );

    /// @dev Event emitted when a draw cannot pick a prize and a capsule is queued back
    event CapsuleRefunded(
        uint256 indexed requestId,
        address indexed player,
        uint256 indexed rarityId
    );

    /// @dev Event emitted when VRF settings change
    event VRFConfigUpdated(
        address coordinator,
        bytes32 keyHash,
        uint256 subscriptionId,
        uint16 requestConfirmations,
        uint32 callbackGasLimit,
        bool nativePayment
    );

    /// @dev Role identifier for administrators
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    error OnlyCoordinatorCanFulfill(address have, address want);

    /// @dev Struct to hold rarity information
    struct RarityInfo {
        address tokenContract;
        string name;
        uint256 price;
        bool enabled;
    }

    /// @dev Struct to hold prize information
    struct PrizeInfo {
        address tokenContract;
        uint256 tokenId;
        uint256 amount;
        bool isERC721;
    }

    /// @dev Struct to hold NFT withdrawal information
    struct NFTWithdrawal {
        address tokenContract;
        uint256 tokenId;
        uint256 amount;
        bool isERC721;
        address to;
        uint256 withdrawalTime;
    }

    /// @dev Chainlink VRF v2.5 request settings
    struct VRFConfig {
        address coordinator;
        bytes32 keyHash;
        uint256 subscriptionId;
        uint16 requestConfirmations;
        uint32 callbackGasLimit;
        bool nativePayment;
    }

    /// @dev In-flight play waiting for VRF
    struct Draw {
        address player;
        uint256 rarityId;
        bool fulfilled;
    }

    /// @dev Prize (or capsule refund) waiting to be claimed.
    ///      `tokenContract == address(0)` means remint a capsule of `tokenId` rarity.
    struct PrizeClaim {
        address tokenContract;
        uint256 tokenId;
        uint256 amount;
        bool isERC721;
    }

    /// @dev Array of all registered rarities
    RarityInfo[] public rarities;

    /// @dev Mapping of token contract addresses to rarityId + 1 (0 = unregistered)
    mapping(address => uint256) private _tokenToRarityPlusOne;

    /// @dev Mapping of rarity IDs to their prize information
    mapping(uint256 => PrizeInfo[]) public prizes;

    /// @dev Mapping of token contract and token ID to rarity ID for approved NFTs
    mapping(address => uint256) public approvedNFTs;

    /// @dev Mapping of withdrawal ID to withdrawal info
    mapping(bytes32 => NFTWithdrawal) public pendingNFTWithdrawals;

    /// @dev Constant for withdrawal delay (1 week)
    uint256 public constant WITHDRAWAL_DELAY = 1 weeks;

    /// @dev Chainlink VRF v2.5 configuration
    VRFConfig public vrfConfig;

    /// @dev VRF request id => in-flight draw
    mapping(uint256 => Draw) public draws;

    /// @dev Prizes reserved by unfulfilled plays (cannot be drawn twice)
    mapping(uint256 => uint256) public pendingDraws;

    /// @dev Player claim queues (filled in VRF callback, transferred in claim)
    mapping(address => PrizeClaim[]) private _claims;

    constructor(VRFConfig memory config) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        if (config.subscriptionId == 0 && config.coordinator != address(0)) {
            config.subscriptionId = IVRFSubscriptionV2Plus(config.coordinator)
                .createSubscription();
            IVRFSubscriptionV2Plus(config.coordinator).addConsumer(
                config.subscriptionId,
                address(this)
            );
        }
        _setVRFConfig(config);
    }

    /// @dev Park native ETH in the Chainlink subscription this machine owns.
    function fundVrf() external payable {
        require(msg.value > 0, "No value");
        IVRFSubscriptionV2Plus(vrfConfig.coordinator).fundSubscriptionWithNative{
            value: msg.value
        }(vrfConfig.subscriptionId);
    }

    /**
     * @dev See {IERC165-supportsInterface}
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(AccessControl, ERC1155Receiver)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Register a new rarity
     * @param tokenContract The ERC1155 contract address for this rarity
     * @param name The name of the rarity
     * @param price The price for this rarity
     */
    function registerRarity(
        address tokenContract,
        string memory name,
        uint256 price
    ) external onlyRole(ADMIN_ROLE) {
        require(tokenContract != address(0), "Invalid token contract");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(price > 0, "Price must be greater than 0");

        // Check if the token contract is already registered
        for (uint256 i = 0; i < rarities.length; i++) {
            require(
                rarities[i].tokenContract != tokenContract,
                "Rarity already registered"
            );
        }

        uint256 rarityId = getRarityCount();
        rarities.push(
            RarityInfo({
                tokenContract: tokenContract,
                name: name,
                price: price,
                enabled: true
            })
        );
        _tokenToRarityPlusOne[tokenContract] = rarityId + 1;

        emit RarityRegistered(rarityId, tokenContract, name, price);
    }

    /**
     * @dev Returns whether a capsule contract is registered and its rarity id.
     */
    function getTokenRarity(
        address tokenContract
    ) public view returns (bool registered, uint256 rarityId) {
        uint256 stored = _tokenToRarityPlusOne[tokenContract];
        registered = stored != 0;
        rarityId = registered ? stored - 1 : 0;
    }

    /**
     * @dev Buy one capsule of `rarityId`. Excess ETH is refunded.
     *      This contract must have MINTER_ROLE on the rarity's GachaNFT.
     */
    function purchase(uint256 rarityId) external payable {
        require(rarityId < rarities.length, "Invalid rarity ID");
        RarityInfo storage rarity = rarities[rarityId];
        require(rarity.tokenContract != address(0), "Invalid rarity ID");
        require(rarity.enabled, "Rarity not enabled");
        require(msg.value >= rarity.price, "Insufficient payment");

        IGachaNFT(rarity.tokenContract).mint(msg.sender, rarityId, 1);

        uint256 refund = msg.value - rarity.price;
        if (refund > 0) {
            (bool success, ) = msg.sender.call{value: refund}("");
            require(success, "Refund failed");
        }

        emit CapsulePurchased(msg.sender, rarityId, rarity.price, msg.value);
    }

    /**
     * @dev Update Chainlink VRF settings. In-flight requests still expect the
     *      previous coordinator to call `rawFulfillRandomWords`.
     */
    function setVRFConfig(
        VRFConfig calldata config
    ) external onlyRole(ADMIN_ROLE) {
        _setVRFConfig(config);
    }

    /**
     * @dev Burn one capsule and request a random prize. The prize is not
     *      transferred here: wait for VRF, then call `claim`.
     *      The player must `setApprovalForAll` this machine on the capsule NFT.
     */
    function play(uint256 rarityId) external nonReentrant returns (uint256 requestId) {
        require(vrfConfig.coordinator != address(0), "VRF not configured");
        require(rarityId < rarities.length, "Invalid rarity ID");
        RarityInfo storage rarity = rarities[rarityId];
        require(rarity.tokenContract != address(0), "Invalid rarity ID");
        require(rarity.enabled, "Rarity not enabled");
        require(
            prizes[rarityId].length > pendingDraws[rarityId],
            "No prizes available"
        );

        pendingDraws[rarityId]++;
        IGachaNFT(rarity.tokenContract).burn(msg.sender, rarityId, 1);

        requestId = IVRFCoordinatorV2Plus(vrfConfig.coordinator)
            .requestRandomWords(
                VRFV2PlusClient.RandomWordsRequest({
                    keyHash: vrfConfig.keyHash,
                    subId: vrfConfig.subscriptionId,
                    requestConfirmations: vrfConfig.requestConfirmations,
                    callbackGasLimit: vrfConfig.callbackGasLimit,
                    numWords: 1,
                    extraArgs: VRFV2PlusClient._argsToBytes(
                        VRFV2PlusClient.ExtraArgsV1({
                            nativePayment: vrfConfig.nativePayment
                        })
                    )
                })
            );

        draws[requestId] = Draw({
            player: msg.sender,
            rarityId: rarityId,
            fulfilled: false
        });

        emit PlayRequested(requestId, msg.sender, rarityId);
    }

    /**
     * @dev Chainlink VRF v2.5 callback. Must not revert: swap-remove into a
     *      claim queue instead of transferring the NFT here.
     */
    function rawFulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) external {
        if (msg.sender != vrfConfig.coordinator) {
            revert OnlyCoordinatorCanFulfill(
                msg.sender,
                vrfConfig.coordinator
            );
        }
        _fulfillRandomWords(requestId, randomWords);
    }

    /**
     * @dev Pull a drawn prize (or a refunded capsule) out of the claim queue.
     */
    function claim(uint256 index) external nonReentrant {
        PrizeClaim[] storage userClaims = _claims[msg.sender];
        require(index < userClaims.length, "Invalid claim");

        PrizeClaim memory prize = userClaims[index];
        userClaims[index] = userClaims[userClaims.length - 1];
        userClaims.pop();

        if (prize.tokenContract == address(0)) {
            IGachaNFT(rarities[prize.tokenId].tokenContract).mint(
                msg.sender,
                prize.tokenId,
                prize.amount
            );
        } else if (prize.isERC721) {
            IERC721(prize.tokenContract).transferFrom(
                address(this),
                msg.sender,
                prize.tokenId
            );
        } else {
            IERC1155(prize.tokenContract).safeTransferFrom(
                address(this),
                msg.sender,
                prize.tokenId,
                prize.amount,
                ""
            );
        }

        emit PrizeClaimed(
            msg.sender,
            prize.tokenContract,
            prize.tokenId,
            prize.amount,
            prize.isERC721
        );
    }

    function getClaimCount(address player) external view returns (uint256) {
        return _claims[player].length;
    }

    function getClaim(
        address player,
        uint256 index
    ) external view returns (PrizeClaim memory) {
        require(index < _claims[player].length, "Invalid claim");
        return _claims[player][index];
    }

    /**
     * @dev Prizes in the bag that are not reserved by in-flight plays.
     */
    function getAvailablePrizeCount(
        uint256 rarityId
    ) public view returns (uint256) {
        require(rarityId < rarities.length, "Invalid rarity ID");
        uint256 n = prizes[rarityId].length;
        uint256 pending = pendingDraws[rarityId];
        return n > pending ? n - pending : 0;
    }

    function _setVRFConfig(VRFConfig memory config) private {
        require(config.callbackGasLimit > 0, "Invalid callback gas");
        vrfConfig = config;
        emit VRFConfigUpdated(
            config.coordinator,
            config.keyHash,
            config.subscriptionId,
            config.requestConfirmations,
            config.callbackGasLimit,
            config.nativePayment
        );
    }

    function _fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) private {
        Draw storage draw = draws[requestId];
        if (draw.player == address(0) || draw.fulfilled) {
            return;
        }
        draw.fulfilled = true;

        uint256 rarityId = draw.rarityId;
        if (pendingDraws[rarityId] > 0) {
            pendingDraws[rarityId]--;
        }

        PrizeInfo[] storage bag = prizes[rarityId];
        if (bag.length == 0 || randomWords.length == 0) {
            _queueCapsuleRefund(requestId, draw.player, rarityId);
            return;
        }

        uint256 index = randomWords[0] % bag.length;
        PrizeInfo memory prize = bag[index];
        bag[index] = bag[bag.length - 1];
        bag.pop();

        _claims[draw.player].push(
            PrizeClaim({
                tokenContract: prize.tokenContract,
                tokenId: prize.tokenId,
                amount: prize.amount,
                isERC721: prize.isERC721
            })
        );

        emit PrizeDrawn(
            requestId,
            draw.player,
            rarityId,
            prize.tokenContract,
            prize.tokenId,
            prize.amount,
            prize.isERC721
        );
    }

    function _queueCapsuleRefund(
        uint256 requestId,
        address player,
        uint256 rarityId
    ) private {
        _claims[player].push(
            PrizeClaim({
                tokenContract: address(0),
                tokenId: rarityId,
                amount: 1,
                isERC721: false
            })
        );
        emit CapsuleRefunded(requestId, player, rarityId);
    }

    /**
     * @dev Checks if an NFT contract is approved for donation
     * @param tokenContract The address of the NFT contract
     * @return approved Whether the NFT is approved
     * @return rarityId The rarity ID the NFT is approved for
     */
    function getApprovedNFT(
        address tokenContract
    ) public view returns (bool approved, uint256 rarityId) {
        uint256 storedId = approvedNFTs[tokenContract];
        approved = storedId != 0;
        rarityId = approved ? storedId - 1 : 0;
    }

    /**
     * @dev Get the total number of registered rarities
     */
    function getRarityCount() public view returns (uint256) {
        return rarities.length;
    }

    /**
     * @dev Get information about a specific rarity
     */
    function getRarityInfo(
        uint256 rarityId
    ) public view returns (RarityInfo memory) {
        require(rarityId < rarities.length, "Invalid rarity ID");
        return rarities[rarityId];
    }

    /**
     * @dev Set the price for a rarity
     */
    function setRarityPrice(
        uint256 rarityId,
        uint256 price
    ) external onlyRole(ADMIN_ROLE) {
        require(rarityId < rarities.length, "Invalid rarity ID");
        require(
            rarities[rarityId].tokenContract != address(0),
            "Invalid rarity ID"
        );
        require(price > 0, "Price must be greater than 0");
        rarities[rarityId].price = price;
        emit RarityPriceUpdated(rarityId, price);
    }

    /**
     * @dev Enable or disable a rarity
     */
    function setRarityEnabled(
        uint256 rarityId,
        bool enabled
    ) external onlyRole(ADMIN_ROLE) {
        require(rarityId < rarities.length, "Invalid rarity ID");
        require(
            rarities[rarityId].tokenContract != address(0),
            "Invalid rarity ID"
        );
        rarities[rarityId].enabled = enabled;
        emit RarityEnabled(rarityId, enabled);
    }

    /**
     * @dev Approves or unapproves an NFT contract for donation to a specific rarity
     * @param rarityId The rarity ID to approve/unapprove the NFT for
     * @param tokenContract The address of the NFT contract
     * @param approve Whether to approve (true) or unapprove (false) the NFT
     */
    function approveNFT(
        uint256 rarityId,
        address tokenContract,
        bool approve
    ) external onlyRole(ADMIN_ROLE) {
        require(tokenContract != address(0), "Invalid token contract");

        if (approve) {
            require(rarityId < rarities.length, "Invalid rarity ID");
            require(
                approvedNFTs[tokenContract] == 0,
                "NFT contract already approved for a rarity"
            );

            // Check if the contract supports ERC721 or ERC1155
            bool isERC721 = IERC721(tokenContract).supportsInterface(
                type(IERC721).interfaceId
            );
            bool isERC1155 = IERC1155(tokenContract).supportsInterface(
                type(IERC1155).interfaceId
            );
            require(
                isERC721 || isERC1155,
                "Contract must be ERC721 or ERC1155"
            );

            // Store the approval (store rarityId + 1 to distinguish from 0)
            approvedNFTs[tokenContract] = rarityId + 1;
        } else {
            require(
                approvedNFTs[tokenContract] != 0,
                "NFT contract not approved"
            );
            approvedNFTs[tokenContract] = 0;
        }

        emit NFTApproved(approve ? rarityId : 0, tokenContract);
    }

    /**
     * @dev Donate an approved NFT to the prize pool
     */
    function donateNFT(
        address tokenContract,
        uint256 tokenId,
        uint256 amount
    ) external {
        uint256 rarityId = approvedNFTs[tokenContract];
        require(rarityId != 0, "NFT not approved for donation");
        require(rarities[rarityId - 1].enabled, "Rarity not enabled");
        require(amount > 0, "Amount must be greater than 0");

        bool isERC721 = ERC165(tokenContract).supportsInterface(
            type(IERC721).interfaceId
        );
        if (isERC721) {
            require(amount == 1, "ERC721 amount must be 1");
            IERC721(tokenContract).transferFrom(
                msg.sender,
                address(this),
                tokenId
            );
        } else {
            IERC1155(tokenContract).safeTransferFrom(
                msg.sender,
                address(this),
                tokenId,
                amount,
                ""
            );
        }

        // Add prize to the pool
        prizes[rarityId - 1].push(
            PrizeInfo({
                tokenContract: tokenContract,
                tokenId: tokenId,
                amount: amount,
                isERC721: isERC721
            })
        );

        emit NFTDonated(
            rarityId - 1,
            tokenContract,
            tokenId,
            amount,
            isERC721,
            msg.sender
        );
    }

    /**
     * @dev Get the number of prizes in a rarity's prize pool
     */
    function getPrizeCount(uint256 rarityId) public view returns (uint256) {
        require(rarityId < rarities.length, "Invalid rarity ID");
        return prizes[rarityId].length;
    }

    /**
     * @dev Get information about a specific prize
     */
    function getPrizeInfo(
        uint256 rarityId,
        uint256 index
    ) public view returns (uint256, uint256) {
        require(rarityId < rarities.length, "Invalid rarity ID");
        require(index < prizes[rarityId].length, "Invalid prize index");
        PrizeInfo memory prize = prizes[rarityId][index];
        return (prize.tokenId, prize.amount);
    }

    /**
     * @dev Redeem a prize from the pool
     */
    function redeemPrize(
        uint256 rarityId,
        address to
    ) external onlyRole(ADMIN_ROLE) {
        require(rarityId < rarities.length, "Invalid rarity ID");
        require(
            rarities[rarityId].tokenContract != address(0),
            "Invalid rarity ID"
        );
        require(rarities[rarityId].enabled, "Rarity not enabled");
        require(
            prizes[rarityId].length > pendingDraws[rarityId],
            "No prizes available"
        );

        PrizeInfo memory prize = prizes[rarityId][prizes[rarityId].length - 1];
        prizes[rarityId].pop();

        if (prize.isERC721) {
            IERC721(prize.tokenContract).transferFrom(
                address(this),
                to,
                prize.tokenId
            );
        } else {
            IERC1155(prize.tokenContract).safeTransferFrom(
                address(this),
                to,
                prize.tokenId,
                prize.amount,
                ""
            );
        }

        emit PrizeRedeemed(
            rarityId,
            prize.tokenContract,
            prize.tokenId,
            prize.amount,
            prize.isERC721,
            to
        );
    }

    /**
     * @dev Withdraw tokens from the contract
     * @param token The address of the token to withdraw (address(0) for ETH)
     * @param amount The amount to withdraw
     * @param to The address to send the tokens to
     */
    function withdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyRole(ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");

        if (token == address(0)) {
            // Withdraw ETH
            require(
                address(this).balance >= amount,
                "Insufficient ETH balance"
            );
            (bool success, ) = to.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // Withdraw ERC20
            require(
                IERC20(token).balanceOf(address(this)) >= amount,
                "Insufficient token balance"
            );
            require(
                IERC20(token).transfer(to, amount),
                "Token transfer failed"
            );
        }

        emit TokensWithdrawn(token, amount, to);
    }

    /**
     * @dev Schedule an NFT withdrawal
     * @param tokenContract The address of the NFT contract
     * @param tokenId The ID of the NFT
     * @param amount The amount to withdraw
     * @param to The address to withdraw to
     */
    function scheduleNFTWithdrawal(
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        address to
    ) external onlyRole(ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");

        bool isERC721 = ERC165(tokenContract).supportsInterface(
            type(IERC721).interfaceId
        );
        if (isERC721) {
            require(amount == 1, "ERC721 amount must be 1");
            require(
                IERC721(tokenContract).ownerOf(tokenId) == address(this),
                "NFT not owned by contract"
            );
        } else {
            require(
                IERC1155(tokenContract).balanceOf(address(this), tokenId) >=
                    amount,
                "Insufficient NFT balance"
            );
        }

        bytes32 withdrawalId = keccak256(
            abi.encodePacked(
                tokenContract,
                tokenId,
                amount,
                to,
                block.timestamp
            )
        );

        uint256 withdrawalTime = block.timestamp + WITHDRAWAL_DELAY;
        pendingNFTWithdrawals[withdrawalId] = NFTWithdrawal({
            tokenContract: tokenContract,
            tokenId: tokenId,
            amount: amount,
            isERC721: isERC721,
            to: to,
            withdrawalTime: withdrawalTime
        });

        emit NFTWithdrawalScheduled(
            tokenContract,
            tokenId,
            amount,
            isERC721,
            to,
            withdrawalTime
        );
    }

    /**
     * @dev Execute a scheduled NFT withdrawal
     * @param withdrawalId The ID of the withdrawal to execute
     */
    function executeNFTWithdrawal(
        bytes32 withdrawalId
    ) external onlyRole(ADMIN_ROLE) {
        NFTWithdrawal memory withdrawal = pendingNFTWithdrawals[withdrawalId];
        require(withdrawal.to != address(0), "Withdrawal not found");
        require(
            block.timestamp >= withdrawal.withdrawalTime,
            "Withdrawal delay not elapsed"
        );

        // Delete withdrawal before transfer to prevent reentrancy
        delete pendingNFTWithdrawals[withdrawalId];
        _removePrizeFromBags(
            withdrawal.tokenContract,
            withdrawal.tokenId,
            withdrawal.amount,
            withdrawal.isERC721
        );

        if (withdrawal.isERC721) {
            IERC721(withdrawal.tokenContract).transferFrom(
                address(this),
                withdrawal.to,
                withdrawal.tokenId
            );
        } else {
            IERC1155(withdrawal.tokenContract).safeTransferFrom(
                address(this),
                withdrawal.to,
                withdrawal.tokenId,
                withdrawal.amount,
                ""
            );
        }

        emit NFTWithdrawn(
            withdrawal.tokenContract,
            withdrawal.tokenId,
            withdrawal.amount,
            withdrawal.isERC721,
            withdrawal.to
        );
    }

    /// @dev Drop or decrement the matching prize slot so the bag stays in sync
    ///      with tokens that left via admin withdrawal.
    function _removePrizeFromBags(
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        bool isERC721
    ) private {
        for (uint256 r = 0; r < rarities.length; r++) {
            PrizeInfo[] storage bag = prizes[r];
            for (uint256 i = 0; i < bag.length; i++) {
                if (
                    bag[i].tokenContract != tokenContract ||
                    bag[i].tokenId != tokenId
                ) {
                    continue;
                }

                if (isERC721 || bag[i].amount == amount) {
                    bag[i] = bag[bag.length - 1];
                    bag.pop();
                    return;
                }

                if (bag[i].amount > amount) {
                    bag[i].amount -= amount;
                    return;
                }
            }
        }
    }

    /**
     * @dev Change the admin role to a new address
     * @param newAdmin The address of the new admin
     */
    function changeAdmin(address newAdmin) external onlyRole(ADMIN_ROLE) {
        require(newAdmin != address(0), "Invalid admin address");
        require(newAdmin != msg.sender, "Cannot transfer to self");
        require(!hasRole(ADMIN_ROLE, newAdmin), "Address is already admin");

        // Revoke admin role from current admin
        _revokeRole(ADMIN_ROLE, msg.sender);
        // Grant admin role to new admin
        _grantRole(ADMIN_ROLE, newAdmin);

        emit AdminChanged(msg.sender, newAdmin);
    }
}
