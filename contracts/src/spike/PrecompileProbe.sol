// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Phase 0 spike: can a Revive contract move a native `Assets` token through its ERC-20 precompile?
/// Not part of the product; deleted once Reachpot.sol lands.
contract PrecompileProbe {
    event Pulled(address indexed token, address indexed from, uint256 amount, uint256 balanceAfter);
    event Pushed(address indexed token, address indexed to, uint256 amount, bool ok, bytes ret);

    function pull(IERC20 token, address from, uint256 amount) external {
        require(token.transferFrom(from, address(this), amount), "transferFrom returned false");
        emit Pulled(address(token), from, amount, token.balanceOf(address(this)));
    }

    /// @dev Low-level call so a failing recipient is reported instead of reverting the whole tx.
    function push(IERC20 token, address to, uint256 amount) external returns (bool ok) {
        bytes memory ret;
        (ok, ret) = address(token).call(abi.encodeCall(IERC20.transfer, (to, amount)));
        if (ok && ret.length > 0) ok = abi.decode(ret, (bool));
        emit Pushed(address(token), to, amount, ok, ret);
    }
}
