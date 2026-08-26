// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {GachaNFT} from "../src/Gacha.sol";
import {GachaMachine} from "../src/Machine.sol";
import {ChainConfig} from "./ChainConfig.sol";

/// @dev Deploy GachaNFT x3 + GachaMachine on Base, Arbitrum, OP, or Ethereum.
///      VRF settings and capsule prices come from ChainConfig / block.chainid.
///
///      PRIVATE_KEY=0x... forge script script/Deploy.s.sol:Deploy --rpc-url $RPC --broadcast
contract Deploy is Script {
    uint256 internal constant MIN_GAS_L2 = 0.0003 ether;
    uint256 internal constant MIN_GAS_ETH = 0.02 ether;

    function run() external {
        uint256 chainId = block.chainid;
        address coordinator = ChainConfig.vrfCoordinator(chainId);

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        uint256 defaultFund = ChainConfig.isEthereumMainnet(chainId) ? 0.05 ether : 0.005 ether;
        uint256 vrfFund = vm.envOr("VRF_FUND_WEI", defaultFund);
        uint256 minGas = ChainConfig.isEthereumMainnet(chainId) ? MIN_GAS_ETH : MIN_GAS_L2;

        if (vm.envOr("FORK_FUND", false)) {
            vm.deal(deployer, 1 ether);
        }

        require(deployer.balance >= vrfFund + minGas, "deployer needs ETH for gas + VRF");

        console2.log("chainId", chainId);
        console2.log("deployer", deployer);
        console2.log("balance", deployer.balance);

        vm.startBroadcast(pk);

        GachaNFT common = new GachaNFT();
        GachaNFT rare = new GachaNFT();
        GachaNFT epic = new GachaNFT();

        GachaMachine machine = new GachaMachine(
            GachaMachine.VRFConfig({
                coordinator: coordinator,
                keyHash: ChainConfig.vrfKeyHash(chainId),
                subscriptionId: 0,
                requestConfirmations: ChainConfig.vrfConfirmations(chainId),
                callbackGasLimit: ChainConfig.VRF_CALLBACK_GAS,
                nativePayment: true
            })
        );

        if (vrfFund > 0) {
            machine.fundVrf{value: vrfFund}();
        }

        machine.registerRarity(address(common), "Common", ChainConfig.commonPrice(chainId));
        machine.registerRarity(address(rare), "Rare", ChainConfig.rarePrice(chainId));
        machine.registerRarity(address(epic), "Epic", ChainConfig.epicPrice(chainId));

        bytes32 minter = common.MINTER_ROLE();
        common.grantRole(minter, address(machine));
        rare.grantRole(minter, address(machine));
        epic.grantRole(minter, address(machine));
        common.revokeRole(minter, deployer);
        rare.revokeRole(minter, deployer);
        epic.revokeRole(minter, deployer);

        vm.stopBroadcast();

        (,, uint256 subId,,,) = machine.vrfConfig();

        console2.log("common", address(common));
        console2.log("rare", address(rare));
        console2.log("epic", address(epic));
        console2.log("machine", address(machine));
        console2.log("vrfSubId", subId);
        console2.log("vrfFund", vrfFund);
    }
}
