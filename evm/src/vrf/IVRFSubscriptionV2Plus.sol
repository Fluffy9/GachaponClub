// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/// @dev Subscription admin surface on Chainlink VRFCoordinatorV2_5.
interface IVRFSubscriptionV2Plus {
    function createSubscription() external returns (uint256 subId);

    function addConsumer(uint256 subId, address consumer) external;

    function fundSubscriptionWithNative(uint256 subId) external payable;

    function cancelSubscription(uint256 subId, address to) external;
}
