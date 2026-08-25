// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {VRFV2PlusClient} from "../../src/vrf/VRFV2PlusClient.sol";
import {IVRFCoordinatorV2Plus, IVRFConsumerV2Plus} from "../../src/vrf/IVRFCoordinatorV2Plus.sol";

/// @dev Records VRF requests and lets tests fulfill them in a later tx.
contract VRFCoordinatorV2PlusMock is IVRFCoordinatorV2Plus {
    uint256 public nextRequestId = 1;
    mapping(uint256 => address) public consumerOf;

    function requestRandomWords(VRFV2PlusClient.RandomWordsRequest calldata) external returns (uint256 requestId) {
        requestId = nextRequestId++;
        consumerOf[requestId] = msg.sender;
    }

    function fulfill(uint256 requestId, uint256 word) external {
        uint256[] memory words = new uint256[](1);
        words[0] = word;
        IVRFConsumerV2Plus(consumerOf[requestId]).rawFulfillRandomWords(requestId, words);
    }

    function fulfillEmpty(uint256 requestId) external {
        uint256[] memory words = new uint256[](0);
        IVRFConsumerV2Plus(consumerOf[requestId]).rawFulfillRandomWords(requestId, words);
    }

    uint256 public nextSubId = 1;

    function createSubscription() external returns (uint256 subId) {
        subId = nextSubId++;
    }

    function addConsumer(uint256, address) external {}

    function fundSubscriptionWithNative(uint256) external payable {}
}
