// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {VRFV2PlusClient} from "./VRFV2PlusClient.sol";

/// @dev Minimal Chainlink VRF v2.5 coordinator surface used by GachaMachine.
interface IVRFCoordinatorV2Plus {
    function requestRandomWords(
        VRFV2PlusClient.RandomWordsRequest calldata req
    ) external returns (uint256 requestId);
}

interface IVRFConsumerV2Plus {
    function rawFulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) external;
}
