// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
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
 * @dev Capsule machine: buy or donate for a capsule, burn it for a VRF draw,
 *      then claim. Odds are computed at fulfillment time (% bag.length).
 */
contract GachaMachine is
    AccessControl,
    ERC1155Holder,
    ERC721Holder,
    ReentrancyGuard,
    Pausable
{
    event RarityRegistered(
        uint256 indexed rarityId,
        address tokenContract,
        string name,
        uint256 price
    );
    event RarityPriceUpdated(uint256 indexed rarityId, uint256 price);
    event RarityEnabled(uint256 indexed rarityId, bool enabled);
    event PrizeAdded(
        uint256 indexed rarityId,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        bool isERC721
    );
    event PrizeRedeemed(
        uint256 indexed rarityId,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        bool isERC721,
        address to
    );
    event NFTApproved(
        uint256 indexed rarityId,
        address tokenContract,
        bool approved
    );
    event NFTDonated(
        uint256 indexed rarityId,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        bool isERC721,
        address from
    );
    event TokensWithdrawn(address indexed token, uint256 amount, address to);
    event AdminTransferStarted(address indexed from, address indexed to);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event CapsulePurchased(
        address indexed buyer,
        uint256 indexed rarityId,
        uint256 price,
        uint256 paid
    );
    event PlayRequested(
        uint256 indexed requestId,
        address indexed player,
        uint256 indexed rarityId
    );
    event PrizeDrawn(
        uint256 indexed requestId,
        address indexed player,
        uint256 indexed rarityId,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        bool isERC721
    );
    event PrizeClaimed(
        address indexed player,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        bool isERC721
    );
    event CapsuleRefunded(
        uint256 indexed requestId,
        address indexed player,
        uint256 indexed rarityId
    );
    event DrawRescued(
        uint256 indexed requestId,
        address indexed player,
        uint256 indexed rarityId
    );
    event RescueDelayUpdated(uint256 delay);
    event VRFConfigUpdated(
        address coordinator,
        bytes32 keyHash,
        uint256 subscriptionId,
        uint16 requestConfirmations,
        uint32 callbackGasLimit,
        bool nativePayment
    );
    event VRFSubscriptionCanceled(uint256 indexed subscriptionId, address indexed to);
    event VRFSubscriptionCreated(uint256 indexed subscriptionId);

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @dev Capsule ERC1155 id on every per-rarity GachaNFT.
    uint256 public constant CAPSULE_ID = 0;
    uint256 public constant DEFAULT_RESCUE_DELAY = 1 days;
    uint8 public constant TOKEN_ERC721 = 1;
    uint8 public constant TOKEN_ERC1155 = 2;

    error OnlyCoordinatorCanFulfill(address have, address want);

    struct RarityInfo {
        address tokenContract;
        string name;
        uint256 price;
        bool enabled;
    }

    struct PrizeInfo {
        address tokenContract;
        uint256 tokenId;
        uint256 amount;
        bool isERC721;
    }

    struct VRFConfig {
        address coordinator;
        bytes32 keyHash;
        uint256 subscriptionId;
        uint16 requestConfirmations;
        uint32 callbackGasLimit;
        bool nativePayment;
    }

    struct Draw {
        address player;
        uint256 rarityId;
        bool fulfilled;
        uint64 requestedAt;
    }

    /// @dev `tokenContract == address(0)` means remint a capsule of `tokenId` rarity.
    struct PrizeClaim {
        address tokenContract;
        uint256 tokenId;
        uint256 amount;
        bool isERC721;
    }

    RarityInfo[] public rarities;
    mapping(address => uint256) private _tokenToRarityPlusOne;
    mapping(uint256 => PrizeInfo[]) public prizes;

    /// @dev Collection approved independently for each rarity bag.
    mapping(address => mapping(uint256 => bool)) public approvedForRarity;
    /// @dev 0 unset, 1 ERC721, 2 ERC1155. Frozen on first `approveNFT`.
    mapping(address => uint8) public tokenStandard;

    address public immutable vrfCoordinator;
    VRFConfig public vrfConfig;
    mapping(uint256 => Draw) public draws;
    mapping(uint256 => uint256) public pendingDraws;
    mapping(address => PrizeClaim[]) private _claims;

    /// @dev Drawn tokens still sitting on this contract until claim.
    mapping(address => mapping(uint256 => uint256)) public reserved1155;
    mapping(address => mapping(uint256 => bool)) public reserved721;

    uint256 public rescueDelay;
    address public pendingAdmin;
    address public adminTransferFrom;

    struct PendingDonation {
        address token;
        uint256 id;
        uint256 amount;
        address from;
    }

    PendingDonation private _pendingDonation;

    constructor(VRFConfig memory config) {
        require(config.coordinator != address(0), "VRF not configured");
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        rescueDelay = DEFAULT_RESCUE_DELAY;
        vrfCoordinator = config.coordinator;
        if (config.subscriptionId == 0) {
            config.subscriptionId = IVRFSubscriptionV2Plus(config.coordinator)
                .createSubscription();
            IVRFSubscriptionV2Plus(config.coordinator).addConsumer(
                config.subscriptionId,
                address(this)
            );
        }
        _setVRFConfig(config);
    }

    function fundVrf() external payable {
        require(msg.value > 0, "No value");
        require(vrfConfig.subscriptionId != 0, "No subscription");
        IVRFSubscriptionV2Plus(vrfCoordinator).fundSubscriptionWithNative{
            value: msg.value
        }(vrfConfig.subscriptionId);
    }

    /**
     * @dev Cancel the machine-owned VRF sub and send leftover LINK/native to `to`.
     *      Play will fail until `createVrfSubscription` opens a new sub on the
     *      same coordinator.
     */
    function cancelVrfSubscription(address to) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(to != address(0), "Invalid recipient");
        uint256 subId = vrfConfig.subscriptionId;
        require(subId != 0, "No subscription");
        require(!_hasPendingDraws(), "Pending draws");

        vrfConfig.subscriptionId = 0;
        IVRFSubscriptionV2Plus(vrfCoordinator).cancelSubscription(subId, to);
        emit VRFSubscriptionCanceled(subId, to);
    }

    /// @dev Open a new machine-owned sub on the frozen Chainlink coordinator.
    function createVrfSubscription() external onlyRole(ADMIN_ROLE) {
        require(vrfConfig.subscriptionId == 0, "Subscription exists");
        uint256 subId = IVRFSubscriptionV2Plus(vrfCoordinator).createSubscription();
        IVRFSubscriptionV2Plus(vrfCoordinator).addConsumer(subId, address(this));
        vrfConfig.subscriptionId = subId;
        emit VRFSubscriptionCreated(subId);
    }

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

    function onERC1155Received(
        address,
        address from,
        uint256 id,
        uint256 value,
        bytes memory data
    ) public override returns (bytes4) {
        require(
            msg.sender == _pendingDonation.token &&
                from == _pendingDonation.from &&
                id == _pendingDonation.id &&
                value == _pendingDonation.amount,
            "Direct transfer disabled"
        );
        return super.onERC1155Received(msg.sender, from, id, value, data);
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public override returns (bytes4) {
        revert("Direct transfer disabled");
    }

    function onERC721Received(
        address,
        address from,
        uint256 tokenId,
        bytes memory
    ) public view override returns (bytes4) {
        require(
            msg.sender == _pendingDonation.token &&
                from == _pendingDonation.from &&
                tokenId == _pendingDonation.id,
            "Direct transfer disabled"
        );
        return this.onERC721Received.selector;
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function setRescueDelay(uint256 delay) external onlyRole(ADMIN_ROLE) {
        require(delay > 0, "Invalid delay");
        rescueDelay = delay;
        emit RescueDelayUpdated(delay);
    }

    function registerRarity(
        address tokenContract,
        string memory name,
        uint256 price
    ) external onlyRole(ADMIN_ROLE) {
        require(tokenContract != address(0), "Invalid token contract");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(price > 0, "Price must be greater than 0");
        require(
            _tokenToRarityPlusOne[tokenContract] == 0,
            "Rarity already registered"
        );

        uint256 rarityId = rarities.length;
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

    function getTokenRarity(
        address tokenContract
    ) public view returns (bool registered, uint256 rarityId) {
        uint256 stored = _tokenToRarityPlusOne[tokenContract];
        registered = stored != 0;
        rarityId = registered ? stored - 1 : 0;
    }

    function purchase(
        uint256 rarityId
    ) external payable nonReentrant whenNotPaused {
        require(rarityId < rarities.length, "Invalid rarity ID");
        RarityInfo storage rarity = rarities[rarityId];
        require(rarity.tokenContract != address(0), "Invalid rarity ID");
        require(rarity.enabled, "Rarity not enabled");
        require(msg.value == rarity.price, "Incorrect payment");

        IGachaNFT(rarity.tokenContract).mint(msg.sender, CAPSULE_ID, 1);
        emit CapsulePurchased(msg.sender, rarityId, rarity.price, msg.value);
    }

    function setVRFConfig(
        VRFConfig calldata config
    ) external onlyRole(ADMIN_ROLE) {
        require(!_hasPendingDraws(), "Pending draws");
        _setVRFConfig(config);
    }

    function play(
        uint256 rarityId
    ) external nonReentrant whenNotPaused returns (uint256 requestId) {
        require(vrfCoordinator != address(0), "VRF not configured");
        require(vrfConfig.subscriptionId != 0, "No subscription");
        require(rarityId < rarities.length, "Invalid rarity ID");
        RarityInfo storage rarity = rarities[rarityId];
        require(rarity.tokenContract != address(0), "Invalid rarity ID");
        require(rarity.enabled, "Rarity not enabled");
        require(
            prizes[rarityId].length > pendingDraws[rarityId],
            "No prizes available"
        );

        pendingDraws[rarityId]++;
        IGachaNFT(rarity.tokenContract).burn(msg.sender, CAPSULE_ID, 1);

        requestId = IVRFCoordinatorV2Plus(vrfCoordinator)
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
            fulfilled: false,
            requestedAt: uint64(block.timestamp)
        });

        emit PlayRequested(requestId, msg.sender, rarityId);
    }

    function rawFulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) external {
        if (msg.sender != vrfCoordinator) {
            revert OnlyCoordinatorCanFulfill(
                msg.sender,
                vrfCoordinator
            );
        }
        _fulfillRandomWords(requestId, randomWords);
    }

    /**
     * @dev Player (after `rescueDelay`) or admin can refund a draw that never
     *      got a VRF callback. Marks the draw fulfilled so a late callback is a no-op.
     */
    function rescueStuckDraw(uint256 requestId) external nonReentrant {
        Draw storage draw = draws[requestId];
        require(draw.player != address(0) && !draw.fulfilled, "Draw not stuck");
        bool isAdmin = hasRole(ADMIN_ROLE, msg.sender);
        require(msg.sender == draw.player || isAdmin, "Not authorized");
        if (!isAdmin) {
            require(
                block.timestamp >= uint256(draw.requestedAt) + rescueDelay,
                "Too early"
            );
        }

        draw.fulfilled = true;
        if (pendingDraws[draw.rarityId] > 0) {
            pendingDraws[draw.rarityId]--;
        }
        _queueCapsuleRefund(requestId, draw.player, draw.rarityId);
        emit DrawRescued(requestId, draw.player, draw.rarityId);
    }

    function claim(uint256 index) external nonReentrant {
        PrizeClaim[] storage userClaims = _claims[msg.sender];
        require(index < userClaims.length, "Invalid claim");

        PrizeClaim memory prize = userClaims[index];
        userClaims[index] = userClaims[userClaims.length - 1];
        userClaims.pop();

        if (prize.tokenContract == address(0)) {
            IGachaNFT(rarities[prize.tokenId].tokenContract).mint(
                msg.sender,
                CAPSULE_ID,
                prize.amount
            );
        } else {
            _unreserve(prize.tokenContract, prize.tokenId, prize.amount, prize.isERC721);
            _sendPrize(prize.tokenContract, prize.tokenId, prize.amount, prize.isERC721, msg.sender);
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

    function getAvailablePrizeCount(
        uint256 rarityId
    ) public view returns (uint256) {
        require(rarityId < rarities.length, "Invalid rarity ID");
        uint256 n = prizes[rarityId].length;
        uint256 pending = pendingDraws[rarityId];
        return n > pending ? n - pending : 0;
    }

    function isApprovedForRarity(
        address tokenContract,
        uint256 rarityId
    ) public view returns (bool) {
        return approvedForRarity[tokenContract][rarityId];
    }

    function getRarityCount() public view returns (uint256) {
        return rarities.length;
    }

    function getRarityInfo(
        uint256 rarityId
    ) public view returns (RarityInfo memory) {
        require(rarityId < rarities.length, "Invalid rarity ID");
        return rarities[rarityId];
    }

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
     * @dev Approve or unapprove a collection for a single rarity bag.
     *      The same collection can be approved for multiple rarities; the donor
     *      picks which bag (and which capsule) at donate time.
     */
    function approveNFT(
        uint256 rarityId,
        address tokenContract,
        bool approve
    ) external onlyRole(ADMIN_ROLE) {
        require(tokenContract != address(0), "Invalid token contract");
        require(rarityId < rarities.length, "Invalid rarity ID");

        if (approve) {
            require(
                !approvedForRarity[tokenContract][rarityId],
                "Already approved for rarity"
            );
            if (tokenStandard[tokenContract] == 0) {
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
                // Prefer 721 when a token reports both, matching the old donate path.
                tokenStandard[tokenContract] = isERC721
                    ? TOKEN_ERC721
                    : TOKEN_ERC1155;
            }
            approvedForRarity[tokenContract][rarityId] = true;
        } else {
            require(
                approvedForRarity[tokenContract][rarityId],
                "NFT contract not approved"
            );
            approvedForRarity[tokenContract][rarityId] = false;
        }

        emit NFTApproved(rarityId, tokenContract, approve);
    }

    /**
     * @dev Donate into `rarityId` and mint one capsule of that rarity.
     *      One call = one bag slot = one capsule, even if ERC1155 amount > 1.
     */
    function donateNFT(
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        uint256 rarityId
    ) external nonReentrant whenNotPaused {
        require(rarityId < rarities.length, "Invalid rarity ID");
        require(
            approvedForRarity[tokenContract][rarityId],
            "NFT not approved for rarity"
        );
        require(rarities[rarityId].enabled, "Rarity not enabled");
        require(amount > 0, "Amount must be greater than 0");

        uint8 standard = tokenStandard[tokenContract];
        require(standard != 0, "NFT not approved for rarity");
        bool isERC721 = standard == TOKEN_ERC721;
        if (isERC721) {
            require(amount == 1, "ERC721 amount must be 1");
            require(
                IERC721(tokenContract).ownerOf(tokenId) == msg.sender,
                "Not token owner"
            );
        }

        uint256 balanceBefore;
        if (!isERC721) {
            balanceBefore = IERC1155(tokenContract).balanceOf(
                address(this),
                tokenId
            );
        }

        _pendingDonation = PendingDonation({
            token: tokenContract,
            id: tokenId,
            amount: amount,
            from: msg.sender
        });
        if (isERC721) {
            IERC721(tokenContract).safeTransferFrom(
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
        delete _pendingDonation;

        if (isERC721) {
            require(
                IERC721(tokenContract).ownerOf(tokenId) == address(this),
                "Transfer failed"
            );
        } else {
            require(
                IERC1155(tokenContract).balanceOf(address(this), tokenId) ==
                    balanceBefore + amount,
                "Transfer failed"
            );
        }

        prizes[rarityId].push(
            PrizeInfo({
                tokenContract: tokenContract,
                tokenId: tokenId,
                amount: amount,
                isERC721: isERC721
            })
        );

        IGachaNFT(rarities[rarityId].tokenContract).mint(
            msg.sender,
            CAPSULE_ID,
            1
        );

        emit NFTDonated(
            rarityId,
            tokenContract,
            tokenId,
            amount,
            isERC721,
            msg.sender
        );
    }

    function getPrizeCount(uint256 rarityId) public view returns (uint256) {
        require(rarityId < rarities.length, "Invalid rarity ID");
        return prizes[rarityId].length;
    }

    function getPrizeInfo(
        uint256 rarityId,
        uint256 index
    ) public view returns (PrizeInfo memory) {
        require(rarityId < rarities.length, "Invalid rarity ID");
        require(index < prizes[rarityId].length, "Invalid prize index");
        return prizes[rarityId][index];
    }

    function redeemPrize(
        uint256 rarityId,
        address to
    ) external onlyRole(ADMIN_ROLE) nonReentrant {
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

        PrizeInfo[] storage bag = prizes[rarityId];
        PrizeInfo memory prize = bag[bag.length - 1];
        bag.pop();

        _sendPrize(prize.tokenContract, prize.tokenId, prize.amount, prize.isERC721, to);

        emit PrizeRedeemed(
            rarityId,
            prize.tokenContract,
            prize.tokenId,
            prize.amount,
            prize.isERC721,
            to
        );
    }

    function withdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");

        if (token == address(0)) {
            require(
                address(this).balance >= amount,
                "Insufficient ETH balance"
            );
            (bool success, ) = to.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
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
     * @dev Instant indexed pull. `tokenContract`/`tokenId` must match the slot
     *      so a VRF swap-and-pop cannot silently redirect the withdrawal.
     */
    function withdrawPrize(
        uint256 rarityId,
        uint256 index,
        address tokenContract,
        uint256 tokenId,
        address to
    ) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(rarityId < rarities.length, "Invalid rarity ID");
        PrizeInfo[] storage bag = prizes[rarityId];
        require(index < bag.length, "Invalid prize index");
        require(bag.length > pendingDraws[rarityId], "Prize reserved");

        PrizeInfo memory prize = bag[index];
        require(
            prize.tokenContract == tokenContract && prize.tokenId == tokenId,
            "Wrong prize"
        );

        bag[index] = bag[bag.length - 1];
        bag.pop();
        _sendPrize(
            prize.tokenContract,
            prize.tokenId,
            prize.amount,
            prize.isERC721,
            to
        );

        emit PrizeRedeemed(
            rarityId,
            prize.tokenContract,
            prize.tokenId,
            prize.amount,
            prize.isERC721,
            to
        );
    }

    function transferAdmin(
        address newAdmin
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newAdmin != address(0), "Invalid admin address");
        require(newAdmin != msg.sender, "Cannot transfer to self");
        pendingAdmin = newAdmin;
        adminTransferFrom = msg.sender;
        emit AdminTransferStarted(msg.sender, newAdmin);
    }

    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "Not pending admin");
        address from = adminTransferFrom;
        pendingAdmin = address(0);
        adminTransferFrom = address(0);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _revokeRole(ADMIN_ROLE, from);
        _revokeRole(DEFAULT_ADMIN_ROLE, from);

        emit AdminChanged(from, msg.sender);
    }

    function cancelAdminTransfer() external onlyRole(DEFAULT_ADMIN_ROLE) {
        pendingAdmin = address(0);
        adminTransferFrom = address(0);
    }

    function _hasPendingDraws() private view returns (bool) {
        for (uint256 i = 0; i < rarities.length; i++) {
            if (pendingDraws[i] != 0) {
                return true;
            }
        }
        return false;
    }

    function _setVRFConfig(VRFConfig memory config) private {
        require(config.coordinator == vrfCoordinator, "Coordinator locked");
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

        _reserve(prize.tokenContract, prize.tokenId, prize.amount, prize.isERC721);
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

    function _reserve(
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        bool isERC721
    ) private {
        if (isERC721) {
            reserved721[tokenContract][tokenId] = true;
        } else {
            reserved1155[tokenContract][tokenId] += amount;
        }
    }

    function _unreserve(
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        bool isERC721
    ) private {
        if (isERC721) {
            reserved721[tokenContract][tokenId] = false;
        } else {
            reserved1155[tokenContract][tokenId] -= amount;
        }
    }

    function _sendPrize(
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        bool isERC721,
        address to
    ) private {
        if (isERC721) {
            IERC721(tokenContract).safeTransferFrom(address(this), to, tokenId);
        } else {
            IERC1155(tokenContract).safeTransferFrom(
                address(this),
                to,
                tokenId,
                amount,
                ""
            );
        }
    }
}
