// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Reachpot} from "../src/Reachpot.sol";
import {MockAsset} from "./utils/Mocks.sol";
import {CampaignView} from "./utils/CampaignView.sol";

/// @notice Runs the golden fixtures produced by `@reachpot/allocation` (TS) through the contract: the TS allocation,
/// root and proofs must be accepted on-chain and pay out exactly, with the leftover refundable to the brand.
contract GoldenTest is Test {
    using CampaignView for Reachpot;

    address oracle = makeAddr("oracle");
    address guardian = makeAddr("guardian");
    address brand = makeAddr("brand");

    function test_golden_uncapped() public {
        _run("uncapped");
    }

    function test_golden_cappedRefill() public {
        _run("capped-refill");
    }

    function test_golden_allCappedLeftover() public {
        _run("all-capped-leftover");
    }

    function test_golden_roundingDust() public {
        _run("rounding-dust");
    }

    function test_golden_singleCreator() public {
        _run("single-creator");
    }

    struct Fixture {
        uint128 pool;
        uint128 cap;
        uint128 total;
        uint128 leftover;
        bytes32 root;
        uint256 count;
    }

    function _uint128(string memory json, string memory key) internal pure returns (uint128) {
        return uint128(vm.parseUint(vm.parseJsonString(json, key)));
    }

    function _load(string memory name) internal view returns (string memory json, Fixture memory f) {
        json = vm.readFile(string.concat(vm.projectRoot(), "/../packages/allocation/fixtures/", name, ".json"));
        f.pool = _uint128(json, ".pool");
        f.cap = _uint128(json, ".cap");
        f.total = _uint128(json, ".totalAllocated");
        f.leftover = _uint128(json, ".leftover");
        f.root = vm.parseJsonBytes32(json, ".root");
        f.count = vm.parseJsonUint(json, ".count");
    }

    function _payouts(string memory json, Fixture memory f) internal pure returns (Reachpot.Payout[] memory ps) {
        ps = new Reachpot.Payout[](f.count);
        for (uint256 i; i < f.count; ++i) {
            string memory p = string.concat(".payouts[", vm.toString(i), "]");
            ps[i] = Reachpot.Payout({
                account: vm.parseJsonAddress(json, string.concat(p, ".account")),
                amount: _uint128(json, string.concat(p, ".amount")),
                proof: vm.parseJsonBytes32Array(json, string.concat(p, ".proof"))
            });
        }
    }

    function _fundedCampaign(string memory name, Fixture memory f)
        internal
        returns (Reachpot rp, MockAsset token, uint256 id)
    {
        rp = new Reachpot(oracle, guardian, 1 hours, 10 minutes, 7 days, 30 days);
        token = new MockAsset();
        token.mint(brand, f.pool);
        vm.startPrank(brand);
        token.approve(address(rp), f.pool);
        id = rp.createCampaign(
            Reachpot.CampaignParams({
                token: IERC20(address(token)),
                pool: f.pool,
                start: uint64(block.timestamp),
                end: uint64(block.timestamp + 1 days),
                measurementDelay: 1 hours,
                capPerCreator: f.cap,
                minViews: 0,
                rulesHash: keccak256(bytes(name))
            })
        );
        vm.stopPrank();
    }

    function _run(string memory name) internal {
        (string memory json, Fixture memory f) = _load(name);
        assertEq(uint256(f.total) + f.leftover, f.pool, "fixture conservation");
        (Reachpot rp, MockAsset token, uint256 id) = _fundedCampaign(name, f);

        vm.warp(block.timestamp + 1 days + 1 hours);
        vm.prank(oracle);
        rp.postRoot(id, f.root, f.total, bytes32(0), 0, 0);
        vm.warp(block.timestamp + 1 hours);

        Reachpot.Payout[] memory ps = _payouts(json, f);
        assertEq(rp.payoutMany(id, ps), f.count, "all paid");
        for (uint256 i; i < f.count; ++i) {
            assertLe(ps[i].amount, f.cap, "cap respected");
            assertEq(token.balanceOf(ps[i].account), ps[i].amount);
        }
        assertEq(rp.get(id).claimed, f.total);
        assertEq(rp.refundable(id), f.leftover);
    }
}
