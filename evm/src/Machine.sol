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
 * @notice Capsule machine on Base: buy or donate for a ticket, burn it for a
 *         Chainlink VRF draw, then claim the prize (or a capsule refund).
 * @dev Eligible bag length is snapshotted at `play` so later donations cannot
 *      steer `random % n` after the VRF word is public. Donate into a bag is
 *      also blocked while that bag has a pending draw. ADMIN_ROLE holds the
 *      bags (hot wallet). ECONOMIST_ROLE can reprice, toggle rarities, and
 *      pause without withdraw access. The VRF coordinator address is immutable.
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

    /// @notice Operator role: bags, VRF, approvals, admin prize pulls, rescue.
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    /// @dev Prices, rarity enable, pause/unpause. Cannot withdraw or approve collections.
    bytes32 public constant ECONOMIST_ROLE = keccak256("ECONOMIST_ROLE");

    /// @dev Capsule ERC1155 id on every per-rarity GachaNFT.
    uint256 public constant CAPSULE_ID = 0;
    /// @notice Default wait before a player (not admin) may `rescueStuckDraw`.
    uint256 public constant DEFAULT_RESCUE_DELAY = 1 days;
    uint8 public constant TOKEN_ERC721 = 1;
    uint8 public constant TOKEN_ERC1155 = 2;

    error OnlyCoordinatorCanFulfill(address have, address want);

    /// @notice One capsule ERC-1155 plus its list price and enable flag.
    struct RarityInfo {
        address tokenContract;
        string name;
        uint256 price;
        bool enabled;
    }

    /// @notice One prize slot in a rarity bag. ERC-1155 `amount` is still one slot.
    struct PrizeInfo {
        address tokenContract;
        uint256 tokenId;
        uint256 amount;
        bool isERC721;
    }

    /// @notice Chainlink VRF v2.5 settings. `coordinator` cannot change after deploy.
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
        /// @dev `prizes[rarityId].length` when `play` ran. Fulfillment uses
        ///      `random % min(bagLength, current bag)` so donations that land
        ///      after play cannot inflate the modulo.
        uint64 bagLength;
    }

    /// @dev `tokenContract == address(0)` means remint a capsule of `tokenId` rarity.
    ///      Packed so `tokenContract` + `isERC721` + `assignedAt` share a slot.
    ///      `assignedAt` is for off-chain monitoring; claim is not delayed on-chain.
    struct PrizeClaim {
        address tokenContract;
        bool isERC721;
        uint64 assignedAt;
        uint256 tokenId;
        uint256 amount;
    }

    RarityInfo[] public rarities;
    /// @dev Maps capsule token → rarityId + 1 so 0 means unregistered.
    mapping(address => uint256) private _tokenToRarityPlusOne;
    /// @notice Prize bag per rarity. Swap-and-pop on draw / admin pull.
    mapping(uint256 => PrizeInfo[]) public prizes;

    /// @dev Collection approved independently for each rarity bag.
    mapping(address => mapping(uint256 => bool)) public approvedForRarity;
    /// @dev 0 unset, 1 ERC721, 2 ERC1155. Frozen on first `approveNFT`.
    mapping(address => uint8) public tokenStandard;

    /// @notice Frozen at deploy. `setVRFConfig` cannot point at another coordinator.
    address public immutable vrfCoordinator;
    VRFConfig public vrfConfig;
    /// @notice In-flight or fulfilled VRF draws, keyed by Chainlink request id.
    mapping(uint256 => Draw) public draws;
    /// @notice Unfulfilled plays per rarity. Those bag slots are reserved.
    mapping(uint256 => uint256) public pendingDraws;
    mapping(address => PrizeClaim[]) private _claims;

    /// @dev Drawn tokens still sitting on this contract until claim.
    mapping(address => mapping(uint256 => uint256)) public reserved1155;
    mapping(address => mapping(uint256 => bool)) public reserved721;

    /// @notice Seconds a player must wait after `play` before they can rescue.
    uint256 public rescueDelay;
    /// @notice Two-step admin handover. Zero when no transfer is pending.
    address public pendingAdmin;
    address public adminTransferFrom;

    struct PendingDonation {
        address token;
        uint256 id;
        uint256 amount;
        address from;
    }

    PendingDonation private _pendingDonation;

    /// @notice Deploys, grants admin to the sender, and opens a VRF sub if `subscriptionId` is 0.
    constructor(VRFConfig memory config) {
        require(config.coordinator != address(0), "VRF not configured");
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(ECONOMIST_ROLE, ADMIN_ROLE);
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

    /// @notice Anyone may top up the machine-owned VRF subscription with native ETH.
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

    /// @notice Accepts an ERC-1155 only as part of `donateNFT`. Direct transfers revert.
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

    /// @notice Batch ERC-1155 transfers are never accepted.
    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public override returns (bytes4) {
        revert("Direct transfer disabled");
    }

    /// @notice Accepts an ERC-721 only as part of `donateNFT`. Direct transfers revert.
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

    /// @dev Economist or admin. Used for pause and pricing, not bag custody.
    modifier onlyEconomist() {
        require(
            hasRole(ECONOMIST_ROLE, msg.sender) ||
                hasRole(ADMIN_ROLE, msg.sender),
            "Not economist"
        );
        _;
    }

    /// @notice Pause buy, play, and donate. Claim and rescue stay available.
    function pause() external onlyEconomist {
        _pause();
    }

    /// @notice Resume buy, play, and donate.
    function unpause() external onlyEconomist {
        _unpause();
    }

    /// @notice Seconds a non-admin player must wait before `rescueStuckDraw`.
    function setRescueDelay(uint256 delay) external onlyRole(ADMIN_ROLE) {
        require(delay > 0, "Invalid delay");
        rescueDelay = delay;
        emit RescueDelayUpdated(delay);
    }

    /// @notice Register a new capsule ERC-1155 and start a prize bag for it.
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

    /// @notice Lookup which rarity bag a capsule token belongs to.
    function getTokenRarity(
        address tokenContract
    ) public view returns (bool registered, uint256 rarityId) {
        uint256 stored = _tokenToRarityPlusOne[tokenContract];
        registered = stored != 0;
        rarityId = registered ? stored - 1 : 0;
    }

    /// @notice Buy one capsule. `msg.value` must equal the on-chain price exactly.
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

    /// @notice Update VRF key hash / gas / sub id. Coordinator is locked. Reverts if any draw is pending.
    function setVRFConfig(
        VRFConfig calldata config
    ) external onlyRole(ADMIN_ROLE) {
        require(!_hasPendingDraws(), "Pending draws");
        _setVRFConfig(config);
    }

    /// @notice Burn one capsule and request a VRF word. Prize is queued for `claim` after fulfill.
    /// @return requestId Chainlink request id (use this for `rescueStuckDraw` if VRF never returns).
    function play(
        uint256 rarityId
    ) external nonReentrant whenNotPaused returns (uint256 requestId) {
        require(vrfCoordinator != address(0), "VRF not configured");
        require(vrfConfig.subscriptionId != 0, "No subscription");
        require(rarityId < rarities.length, "Invalid rarity ID");
        RarityInfo storage rarity = rarities[rarityId];
        require(rarity.tokenContract != address(0), "Invalid rarity ID");
        require(rarity.enabled, "Rarity not enabled");
        uint256 bagLen = prizes[rarityId].length;
        require(bagLen > pendingDraws[rarityId], "No prizes available");
        require(bagLen <= type(uint64).max, "Bag too large");

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
            requestedAt: uint64(block.timestamp),
            bagLength: uint64(bagLen)
        });

        emit PlayRequested(requestId, msg.sender, rarityId);
    }

    /// @notice Chainlink VRF callback. Anyone else reverts. Empty words refund a capsule.
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

    /// @notice Pull a queued prize (or refunded capsule). Swap-and-pop; claiming 0 repeatedly drains the queue.
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

    /// @notice Number of unclaimed prizes / refunds for `player`.
    function getClaimCount(address player) external view returns (uint256) {
        return _claims[player].length;
    }

    /// @notice Inspect a queued claim. `tokenContract == address(0)` is a capsule refund (`tokenId` = rarity).
    function getClaim(
        address player,
        uint256 index
    ) external view returns (PrizeClaim memory) {
        require(index < _claims[player].length, "Invalid claim");
        return _claims[player][index];
    }

    /// @notice Bag length minus in-flight draws. This is how many plays can still start.
    function getAvailablePrizeCount(
        uint256 rarityId
    ) public view returns (uint256) {
        require(rarityId < rarities.length, "Invalid rarity ID");
        uint256 n = prizes[rarityId].length;
        uint256 pending = pendingDraws[rarityId];
        return n > pending ? n - pending : 0;
    }

    /// @notice Whether `tokenContract` may be donated into this rarity bag.
    function isApprovedForRarity(
        address tokenContract,
        uint256 rarityId
    ) public view returns (bool) {
        return approvedForRarity[tokenContract][rarityId];
    }

    /// @notice Number of registered rarities (three on the live Base machine).
    function getRarityCount() public view returns (uint256) {
        return rarities.length;
    }

    /// @notice Capsule token, name, price, and enabled flag for `rarityId`.
    function getRarityInfo(
        uint256 rarityId
    ) public view returns (RarityInfo memory) {
        require(rarityId < rarities.length, "Invalid rarity ID");
        return rarities[rarityId];
    }

    /// @notice Set capsule price in wei. Must be > 0. Economist or admin.
    function setRarityPrice(
        uint256 rarityId,
        uint256 price
    ) external onlyEconomist {
        require(rarityId < rarities.length, "Invalid rarity ID");
        require(
            rarities[rarityId].tokenContract != address(0),
            "Invalid rarity ID"
        );
        require(price > 0, "Price must be greater than 0");
        rarities[rarityId].price = price;
        emit RarityPriceUpdated(rarityId, price);
    }

    /// @notice Enable or disable buying / donating / playing this rarity.
    function setRarityEnabled(
        uint256 rarityId,
        bool enabled
    ) external onlyEconomist {
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
     *      Blocked while that bag has an in-flight VRF draw so a donation
     *      cannot occupy a slot vacated by another fulfill.
     */
    function donateNFT(
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        uint256 rarityId
    ) external nonReentrant whenNotPaused {
        require(rarityId < rarities.length, "Invalid rarity ID");
        require(pendingDraws[rarityId] == 0, "Draws pending");
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

    /// @notice Raw bag length, including slots reserved by pending draws.
    function getPrizeCount(uint256 rarityId) public view returns (uint256) {
        require(rarityId < rarities.length, "Invalid rarity ID");
        return prizes[rarityId].length;
    }

    /// @notice Prize sitting at `index` in the bag (not a pending claim).
    function getPrizeInfo(
        uint256 rarityId,
        uint256 index
    ) public view returns (PrizeInfo memory) {
        require(rarityId < rarities.length, "Invalid rarity ID");
        require(index < prizes[rarityId].length, "Invalid prize index");
        return prizes[rarityId][index];
    }

    /// @notice Admin LIFO pull of the last bag slot. Instant; this is a hot wallet.
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

    /// @notice Withdraw ETH (`token == address(0)`) or ERC-20 from the machine treasury.
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

    /// @notice Start two-step handover of DEFAULT_ADMIN_ROLE and ADMIN_ROLE.
    function transferAdmin(
        address newAdmin
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newAdmin != address(0), "Invalid admin address");
        require(newAdmin != msg.sender, "Cannot transfer to self");
        pendingAdmin = newAdmin;
        adminTransferFrom = msg.sender;
        emit AdminTransferStarted(msg.sender, newAdmin);
    }

    /// @notice Pending admin accepts. Old admin loses both admin roles.
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

    /// @notice Current default admin aborts a pending handover.
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

    /// @dev VRF fulfill: pick `word % min(snapshot, current length)`, reserve, queue claim.
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
        uint256 bound = uint256(draw.bagLength);
        if (bound > bag.length) {
            bound = bag.length;
        }
        if (bound == 0 || randomWords.length == 0) {
            _queueCapsuleRefund(requestId, draw.player, rarityId);
            return;
        }

        uint256 index = randomWords[0] % bound;
        PrizeInfo memory prize = bag[index];
        bag[index] = bag[bag.length - 1];
        bag.pop();

        _reserve(prize.tokenContract, prize.tokenId, prize.amount, prize.isERC721);
        _pushClaim(
            draw.player,
            prize.tokenContract,
            prize.tokenId,
            prize.amount,
            prize.isERC721
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

    /// @dev Refund path: queue a capsule remint (`tokenContract == 0`, `tokenId` = rarity).
    function _queueCapsuleRefund(
        uint256 requestId,
        address player,
        uint256 rarityId
    ) private {
        _pushClaim(player, address(0), rarityId, 1, false);
        emit CapsuleRefunded(requestId, player, rarityId);
    }

    function _pushClaim(
        address player,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        bool isERC721
    ) private {
        _claims[player].push(
            PrizeClaim({
                tokenContract: tokenContract,
                isERC721: isERC721,
                assignedAt: uint64(block.timestamp),
                tokenId: tokenId,
                amount: amount
            })
        );
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
