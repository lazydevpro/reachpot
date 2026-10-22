// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Test token that, like a native-asset precompile, reverts when the recipient account "cannot be created".
contract MockAsset is ERC20 {
    mapping(address => bool) public blocked;

    constructor() ERC20("Reachpot USD (mock)", "rUSD") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setBlocked(address who, bool b) external {
        blocked[who] = b;
    }

    function _update(address from, address to, uint256 value) internal override {
        require(!blocked[to], "NoProvider");
        super._update(from, to, value);
    }
}

/// @notice Commutative-keccak Merkle tree over up to 4 leaves (matches OpenZeppelin MerkleProof verification).
library TinyMerkle {
    function hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encode(a, b)) : keccak256(abi.encode(b, a));
    }

    /// @dev Pads to 4 leaves with zero hashes; returns root and per-leaf proofs.
    function build(bytes32[] memory leaves) internal pure returns (bytes32 root, bytes32[][] memory proofs) {
        require(leaves.length > 0 && leaves.length <= 4, "1..4 leaves");
        bytes32[4] memory l;
        for (uint256 i; i < leaves.length; ++i) l[i] = leaves[i];
        bytes32 left = hashPair(l[0], l[1]);
        bytes32 right = hashPair(l[2], l[3]);
        root = hashPair(left, right);
        proofs = new bytes32[][](leaves.length);
        for (uint256 i; i < leaves.length; ++i) {
            proofs[i] = new bytes32[](2);
            proofs[i][0] = l[i ^ 1];
            proofs[i][1] = i < 2 ? right : left;
        }
    }
}
