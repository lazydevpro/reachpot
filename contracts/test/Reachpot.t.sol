// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Reachpot} from "../src/Reachpot.sol";
import {MockAsset, TinyMerkle} from "./utils/Mocks.sol";

contract ReachpotTest is Test {
    Reachpot rp;
    MockAsset token;

    address owner = makeAddr("owner");
    address oracle = makeAddr("oracle");
    address guardian = makeAddr("guardian");
    address brand = makeAddr("brand");
    address keeper = makeAddr("keeper");
    address[4] creators = [makeAddr("c0"), makeAddr("c1"), makeAddr("c2"), makeAddr("c3")];

    uint64 constant DISPUTE = 1 hours;
    uint32 constant MIN_DELAY = 10 minutes;
    uint64 constant ROOT_TIMEOUT = 7 days;
    uint64 constant CLAIM_WINDOW = 30 days;
    uint128 constant POOL = 1_000e6;

    function setUp() public {
        vm.warp(1_800_000_000);
        rp = new Reachpot(owner, oracle, guardian, DISPUTE, MIN_DELAY, ROOT_TIMEOUT, CLAIM_WINDOW);
        token = new MockAsset();
        token.mint(brand, 1_000_000e6);
        vm.prank(brand);
        token.approve(address(rp), type(uint256).max);
    }

    // ---------------------------------------------------------------- helpers

    function _params() internal view returns (Reachpot.CampaignParams memory) {
        return Reachpot.CampaignParams({
            token: IERC20(address(token)),
            pool: POOL,
            start: uint64(block.timestamp),
            end: uint64(block.timestamp + 1 days),
            measurementDelay: 1 hours,
            capPerCreator: 500e6,
            minViews: 100,
            rulesHash: keccak256("rules v1")
        });
    }

    function _create() internal returns (uint256 id) {
        vm.prank(brand);
        id = rp.createCampaign(_params());
    }

    function _toMeasured(uint256 id) internal {
        Reachpot.Campaign memory c = rp.getCampaign(id);
        vm.warp(uint256(c.end) + c.measurementDelay);
    }

    struct Alloc {
        bytes32 root;
        uint128 total;
        uint128[] amounts;
        bytes32[][] proofs;
    }

    function _alloc(uint128[] memory amounts) internal view returns (Alloc memory a) {
        bytes32[] memory leaves = new bytes32[](amounts.length);
        for (uint256 i; i < amounts.length; ++i) {
            leaves[i] = rp.leaf(creators[i], amounts[i]);
            a.total += amounts[i];
        }
        (a.root, a.proofs) = TinyMerkle.build(leaves);
        a.amounts = amounts;
    }

    function _defaultAlloc() internal view returns (Alloc memory) {
        uint128[] memory amounts = new uint128[](3);
        amounts[0] = 500e6;
        amounts[1] = 300e6;
        amounts[2] = 150e6; // 950 allocated, 50 left over
        return _alloc(amounts);
    }

    function _post(uint256 id, Alloc memory a) internal {
        vm.prank(oracle);
        rp.postRoot(id, a.root, a.total, keccak256("snapshot"), 123, 1);
    }

    function _payouts(Alloc memory a) internal view returns (Reachpot.Payout[] memory ps) {
        ps = new Reachpot.Payout[](a.amounts.length);
        for (uint256 i; i < a.amounts.length; ++i) {
            ps[i] = Reachpot.Payout(creators[i], a.amounts[i], a.proofs[i]);
        }
    }

    function _toPayable(uint256 id, Alloc memory a) internal {
        _toMeasured(id);
        _post(id, a);
        vm.warp(block.timestamp + DISPUTE);
    }

    // ----------------------------------------------------------------- create

    function test_create_escrowsPoolAndRecordsParams() public {
        uint256 before = token.balanceOf(brand);
        uint256 id = _create();
        assertEq(id, 1);
        assertEq(token.balanceOf(address(rp)), POOL);
        assertEq(token.balanceOf(brand), before - POOL);
        Reachpot.Campaign memory c = rp.getCampaign(id);
        assertEq(c.brand, brand);
        assertEq(c.pool, POOL);
        assertEq(c.rulesHash, keccak256("rules v1"));
        assertEq(uint8(rp.status(id)), uint8(Reachpot.Status.Open));
    }

    function test_create_revertsOnBadParams() public {
        Reachpot.CampaignParams memory p = _params();
        p.pool = 0;
        _expectCreateRevert(p);

        p = _params();
        p.end = p.start;
        _expectCreateRevert(p);

        p = _params();
        p.measurementDelay = MIN_DELAY - 1;
        _expectCreateRevert(p);

        p = _params();
        p.capPerCreator = 0;
        _expectCreateRevert(p);

        p = _params();
        p.token = IERC20(address(0));
        _expectCreateRevert(p);
    }

    function _expectCreateRevert(Reachpot.CampaignParams memory p) internal {
        vm.prank(brand);
        vm.expectRevert(Reachpot.InvalidParams.selector);
        rp.createCampaign(p);
    }

    // ------------------------------------------------------------ root (AC2)

    function test_postRoot_onlyOracle() public {
        uint256 id = _create();
        _toMeasured(id);
        Alloc memory a = _defaultAlloc();
        vm.expectRevert(Reachpot.NotOracle.selector);
        rp.postRoot(id, a.root, a.total, bytes32(0), 0, 0);
    }

    function test_postRoot_revertsBeforeMeasurementEnds() public {
        uint256 id = _create();
        Reachpot.Campaign memory c = rp.getCampaign(id);
        vm.warp(uint256(c.end) + c.measurementDelay - 1);
        Alloc memory a = _defaultAlloc();
        vm.prank(oracle);
        vm.expectRevert(abi.encodeWithSelector(Reachpot.WrongStatus.selector, Reachpot.Status.Measuring));
        rp.postRoot(id, a.root, a.total, bytes32(0), 0, 0);
    }

    function test_postRoot_revertsWhenAllocationExceedsPool() public {
        uint256 id = _create();
        _toMeasured(id);
        vm.prank(oracle);
        vm.expectRevert(Reachpot.AllocationExceedsPool.selector);
        rp.postRoot(id, keccak256("r"), POOL + 1, bytes32(0), 0, 0);
    }

    // ------------------------------------------------------- dispute (AC3)

    function test_cancelRoot_inWindow_thenRepost() public {
        uint256 id = _create();
        _toMeasured(id);
        Alloc memory a = _defaultAlloc();
        _post(id, a);
        assertEq(uint8(rp.status(id)), uint8(Reachpot.Status.Disputable));

        vm.expectRevert(Reachpot.NotGuardian.selector);
        rp.cancelRoot(id, "bad");

        vm.prank(guardian);
        rp.cancelRoot(id, "bot views");
        assertEq(rp.getCampaign(id).root, bytes32(0));
        assertEq(uint8(rp.status(id)), uint8(Reachpot.Status.AwaitingRoot));

        _post(id, a);
        assertEq(rp.getCampaign(id).root, a.root);
    }

    function test_cancelRoot_revertsAfterWindow() public {
        uint256 id = _create();
        _toPayable(id, _defaultAlloc());
        vm.prank(guardian);
        vm.expectRevert(abi.encodeWithSelector(Reachpot.WrongStatus.selector, Reachpot.Status.Payable));
        rp.cancelRoot(id, "late");
    }

    function test_payout_blockedDuringDisputeWindow() public {
        uint256 id = _create();
        _toMeasured(id);
        Alloc memory a = _defaultAlloc();
        _post(id, a);
        vm.expectRevert(abi.encodeWithSelector(Reachpot.WrongStatus.selector, Reachpot.Status.Disputable));
        rp.payoutMany(id, _payouts(a));
    }

    // ------------------------------------------------------- payouts (AC4)

    function test_payoutMany_paysExactAmounts_andRefundsLeftover() public {
        uint256 id = _create();
        Alloc memory a = _defaultAlloc();
        _toPayable(id, a);

        vm.prank(keeper);
        uint256 paid = rp.payoutMany(id, _payouts(a));
        assertEq(paid, 3);
        for (uint256 i; i < 3; ++i) {
            assertEq(token.balanceOf(creators[i]), a.amounts[i]);
            assertTrue(rp.isPaid(id, creators[i]));
        }
        assertEq(rp.getCampaign(id).claimed, a.total);

        uint256 brandBefore = token.balanceOf(brand);
        assertEq(rp.refundable(id), POOL - a.total);
        rp.refund(id); // anyone may trigger; funds go to the brand
        assertEq(token.balanceOf(brand), brandBefore + POOL - a.total);
        assertEq(token.balanceOf(address(rp)), 0);
        vm.expectRevert(Reachpot.NothingToRefund.selector);
        rp.refund(id);
    }

    function test_payoutMany_isIdempotent() public {
        uint256 id = _create();
        Alloc memory a = _defaultAlloc();
        _toPayable(id, a);
        rp.payoutMany(id, _payouts(a));
        assertEq(rp.payoutMany(id, _payouts(a)), 0);
        assertEq(token.balanceOf(creators[0]), a.amounts[0]);
    }

    function test_payout_revertsOnDoublePayAndBadProof() public {
        uint256 id = _create();
        Alloc memory a = _defaultAlloc();
        _toPayable(id, a);
        rp.payout(id, creators[0], a.amounts[0], a.proofs[0]);

        vm.expectRevert(abi.encodeWithSelector(Reachpot.AlreadyPaid.selector, creators[0]));
        rp.payout(id, creators[0], a.amounts[0], a.proofs[0]);

        vm.expectRevert(abi.encodeWithSelector(Reachpot.InvalidProof.selector, creators[1]));
        rp.payout(id, creators[1], a.amounts[1] + 1, a.proofs[1]);
    }

    // ------------------------------------------------ failing recipient (AC5)

    function test_payoutMany_skipsFailingRecipient_andRetryLater() public {
        uint256 id = _create();
        Alloc memory a = _defaultAlloc();
        _toPayable(id, a);
        token.setBlocked(creators[1], true);

        vm.expectEmit(true, true, false, false, address(rp));
        emit Reachpot.PayoutFailed(id, creators[1], a.amounts[1], "");
        uint256 paid = rp.payoutMany(id, _payouts(a));

        assertEq(paid, 2);
        assertEq(token.balanceOf(creators[0]), a.amounts[0]);
        assertEq(token.balanceOf(creators[1]), 0);
        assertEq(token.balanceOf(creators[2]), a.amounts[2]);
        assertFalse(rp.isPaid(id, creators[1]));
        assertEq(rp.getCampaign(id).claimed, a.amounts[0] + a.amounts[2]);

        token.setBlocked(creators[1], false);
        rp.payout(id, creators[1], a.amounts[1], a.proofs[1]);
        assertEq(token.balanceOf(creators[1]), a.amounts[1]);
    }

    function test_payout_single_revertsWhenTransferFails() public {
        uint256 id = _create();
        Alloc memory a = _defaultAlloc();
        _toPayable(id, a);
        token.setBlocked(creators[0], true);
        vm.expectRevert();
        rp.payout(id, creators[0], a.amounts[0], a.proofs[0]);
        assertFalse(rp.isPaid(id, creators[0]));
    }

    // ------------------------------------------------------ refunds / expiry

    function test_abandoned_fullRefund_andNoLateRoot() public {
        uint256 id = _create();
        _toMeasured(id);
        vm.warp(block.timestamp + ROOT_TIMEOUT);
        assertEq(uint8(rp.status(id)), uint8(Reachpot.Status.Abandoned));
        assertEq(rp.refundable(id), POOL);
        rp.refund(id);
        assertEq(token.balanceOf(address(rp)), 0);

        Alloc memory a = _defaultAlloc();
        vm.prank(oracle);
        vm.expectRevert(abi.encodeWithSelector(Reachpot.WrongStatus.selector, Reachpot.Status.Abandoned));
        rp.postRoot(id, a.root, a.total, bytes32(0), 0, 0);
    }

    function test_brandCannotRefundLivePool() public {
        uint256 id = _create();
        assertEq(rp.refundable(id), 0);
        vm.expectRevert(Reachpot.NothingToRefund.selector);
        rp.refund(id);

        _toMeasured(id);
        _post(id, _defaultAlloc());
        assertEq(rp.refundable(id), 0); // still disputable
    }

    function test_expired_refundsUnclaimed_andStopsPayouts() public {
        uint256 id = _create();
        Alloc memory a = _defaultAlloc();
        _toPayable(id, a);
        rp.payout(id, creators[0], a.amounts[0], a.proofs[0]);
        rp.refund(id); // leftover 50

        vm.warp(block.timestamp + CLAIM_WINDOW);
        assertEq(uint8(rp.status(id)), uint8(Reachpot.Status.Expired));
        assertEq(rp.refundable(id), a.amounts[1] + a.amounts[2]);
        rp.refund(id);
        assertEq(token.balanceOf(address(rp)), 0);

        vm.expectRevert(abi.encodeWithSelector(Reachpot.WrongStatus.selector, Reachpot.Status.Expired));
        rp.payout(id, creators[1], a.amounts[1], a.proofs[1]);
    }

    // ------------------------------------------------------------------ admin

    function test_setOracleAndGuardian_onlyOwner() public {
        address n = makeAddr("new");
        vm.expectRevert();
        rp.setOracle(n);
        vm.startPrank(owner);
        rp.setOracle(n);
        rp.setGuardian(n);
        vm.stopPrank();
        assertEq(rp.oracle(), n);
        assertEq(rp.guardian(), n);
    }

    // ------------------------------------------------------------------- fuzz

    function testFuzz_fullLifecycle_conservesFunds(uint128 a0, uint128 a1, uint128 a2, uint128 a3, bool blockOne)
        public
    {
        uint128[] memory amounts = new uint128[](4);
        amounts[0] = uint128(bound(a0, 1, POOL));
        amounts[1] = uint128(bound(a1, 0, POOL - amounts[0]));
        amounts[2] = uint128(bound(a2, 0, POOL - amounts[0] - amounts[1]));
        amounts[3] = uint128(bound(a3, 0, POOL - amounts[0] - amounts[1] - amounts[2]));
        Alloc memory a = _alloc(amounts);

        uint256 id = _create();
        uint256 brandStart = token.balanceOf(brand) + POOL;
        _toPayable(id, a);
        if (blockOne) token.setBlocked(creators[3], true);
        rp.payoutMany(id, _payouts(a));
        if (rp.refundable(id) > 0) rp.refund(id); // nothing left over when the whole pool is allocated

        Reachpot.Campaign memory c = rp.getCampaign(id);
        assertLe(c.claimed, c.totalAllocated);
        assertLe(c.totalAllocated, c.pool);
        assertEq(token.balanceOf(address(rp)), c.pool - c.claimed - c.refunded);

        vm.warp(block.timestamp + CLAIM_WINDOW);
        if (rp.refundable(id) > 0) rp.refund(id);
        uint256 paidOut;
        for (uint256 i; i < 4; ++i) paidOut += token.balanceOf(creators[i]);
        assertEq(token.balanceOf(address(rp)), 0);
        assertEq(token.balanceOf(brand) + paidOut, brandStart);
    }
}
