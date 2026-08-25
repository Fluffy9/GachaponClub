// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../src/Machine.sol";
import "../src/Gacha.sol";
import "./MockPrizeNFT.sol";
import "./mocks/TestHelpers.sol";
import "./mocks/VRFCoordinatorV2PlusMock.sol";

/// @dev Bounded handler for prize-pool accounting invariants.
contract PrizePoolHandler is Test {
    GachaMachine public machine;
    MockPrizeNFT public prize;
    address public admin;
    address public user;

    uint256 public constant TOKEN_ID = 1;

    uint256 public ghostPrizeCount;
    uint256 public ghostBalance;

    constructor(GachaMachine machine_, MockPrizeNFT prize_, address admin_, address user_) {
        machine = machine_;
        prize = prize_;
        admin = admin_;
        user = user_;
    }

    function donate(uint256 amount) external {
        amount = bound(amount, 1, 50);
        prize.mint(user, TOKEN_ID, amount);
        vm.prank(user);
        machine.donateNFT(address(prize), TOKEN_ID, amount);
        ghostPrizeCount++;
        ghostBalance += amount;
    }

    function redeem() external {
        uint256 count = machine.getPrizeCount(0);
        if (count == 0) return;

        (, uint256 amount) = machine.getPrizeInfo(0, count - 1);
        vm.prank(admin);
        machine.redeemPrize(0, user);
        ghostPrizeCount--;
        ghostBalance -= amount;
    }
}

contract PrizePoolInvariantTest is Test {
    GachaMachine public machine;
    MockPrizeNFT public prize;
    PrizePoolHandler public handler;

    address public owner = makeAddr("owner");
    address public admin = makeAddr("admin");
    address public user = makeAddr("user");

    function setUp() public {
        vm.startPrank(owner);
        VRFCoordinatorV2PlusMock vrf = new VRFCoordinatorV2PlusMock();
        machine = new GachaMachine(MachineHarness.vrfConfig(address(vrf)));
        GachaNFT capsule = new GachaNFT();
        prize = new MockPrizeNFT();
        bytes32 machineAdmin = machine.ADMIN_ROLE();
        bytes32 prizeMinter = prize.MINTER_ROLE();
        machine.grantRole(machineAdmin, admin);
        vm.stopPrank();

        vm.startPrank(admin);
        machine.registerRarity(address(capsule), "Common", 0.01 ether);
        machine.approveNFT(0, address(prize), true);
        vm.stopPrank();

        vm.prank(user);
        prize.setApprovalForAll(address(machine), true);

        handler = new PrizePoolHandler(machine, prize, admin, user);

        vm.prank(owner);
        prize.grantRole(prizeMinter, address(handler));

        targetContract(address(handler));
        bytes4[] memory selectors = new bytes4[](2);
        selectors[0] = PrizePoolHandler.donate.selector;
        selectors[1] = PrizePoolHandler.redeem.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    function invariant_prizeCountMatchesGhost() public view {
        assertEq(machine.getPrizeCount(0), handler.ghostPrizeCount());
    }

    function invariant_tokenBalanceMatchesGhost() public view {
        assertEq(prize.balanceOf(address(machine), handler.TOKEN_ID()), handler.ghostBalance());
    }
}
