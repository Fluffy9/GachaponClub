// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Deploy} from "./Deploy.s.sol";

/// @dev Alias for script/Deploy.s.sol. Prefer `forge script script/Deploy.s.sol:Deploy`.
contract DeployBase is Deploy {}
