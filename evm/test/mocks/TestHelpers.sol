// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../src/Machine.sol";

library MachineHarness {
    function vrfConfig(address coordinator) internal pure returns (GachaMachine.VRFConfig memory cfg) {
        cfg.coordinator = coordinator;
        cfg.keyHash = bytes32(uint256(1));
        cfg.subscriptionId = 1;
        cfg.requestConfirmations = 1;
        cfg.callbackGasLimit = 200_000;
        cfg.nativePayment = true;
    }
}

/// @dev Rejects ETH so GachaMachine.withdraw can be tested for failed transfers.
contract RevertingReceiver {
    receive() external payable {
        revert("ETH rejected");
    }
}

/// @dev Empty contract used to prove approveNFT rejects non-token addresses.
contract DummyContract {}

/// @dev ERC20 that reports a balance but always fails transfer().
contract FalseReturnERC20 is ERC20 {
    constructor() ERC20("False Token", "FALSE") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transfer(address, uint256) public pure override returns (bool) {
        return false;
    }
}
