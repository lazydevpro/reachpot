// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Reachpot — pro-rata creator campaigns on Portaldot
/// @notice A brand escrows a pool in any ERC-20 — including Portaldot native `Assets` tokens through their ERC-20
/// precompile. After the campaign window, the oracle posts a Merkle root of per-creator payouts (split by views,
/// computed off-chain from a snapshot stored in `TransactionStorage`). The guardian can cancel a bad root during the
/// dispute window; afterwards anyone can push payouts. Brands cannot withdraw a live pool.
contract Reachpot is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status {
        None,
        Scheduled, // before start
        Open, // accepting submissions
        Measuring, // window closed, views still accruing
        AwaitingRoot, // oracle may post the root
        Disputable, // root posted, guardian may cancel
        Payable, // payouts can be pushed
        Expired, // claim window over; unclaimed funds refundable
        Abandoned // no root before the deadline; full refund
    }

    struct CampaignParams {
        IERC20 token;
        uint128 pool;
        uint64 start;
        uint64 end;
        uint32 measurementDelay;
        uint128 capPerCreator;
        uint64 minViews;
        bytes32 rulesHash;
    }

    struct Campaign {
        // slot 0
        address brand;
        uint64 start;
        uint32 measurementDelay;
        // slot 1
        IERC20 token;
        uint64 end;
        // slot 2
        uint128 pool;
        uint128 totalAllocated;
        // slot 3
        uint128 claimed;
        uint128 refunded;
        // slot 4
        uint128 capPerCreator;
        uint64 minViews;
        uint64 rootPostedAt;
        // slots 5-7
        bytes32 rulesHash;
        bytes32 root;
        bytes32 snapshotHash;
        // slot 8: TransactionStorage location of the snapshot
        uint32 snapshotBlock;
        uint32 snapshotIndex;
    }

    struct Payout {
        address account;
        uint128 amount;
        bytes32[] proof;
    }

    /// @notice How long the guardian can cancel a posted root.
    uint64 public immutable disputeWindow;
    /// @notice Lower bound for a campaign's measurement delay.
    uint32 public immutable minMeasurementDelay;
    /// @notice If no root is posted within this long after measurement ends, the brand gets a full refund.
    uint64 public immutable rootTimeout;
    /// @notice How long payouts stay claimable after the dispute window; then unclaimed funds return to the brand.
    uint64 public immutable claimWindow;

    address public oracle;
    address public guardian;
    uint256 public campaignCount;

    mapping(uint256 id => Campaign) internal _campaigns;
    mapping(uint256 id => mapping(address account => bool)) public isPaid;

    event CampaignCreated(
        uint256 indexed id,
        address indexed brand,
        IERC20 indexed token,
        uint128 pool,
        uint64 start,
        uint64 end,
        uint32 measurementDelay,
        uint128 capPerCreator,
        uint64 minViews,
        bytes32 rulesHash
    );
    event RootPosted(
        uint256 indexed id,
        bytes32 root,
        uint128 totalAllocated,
        bytes32 snapshotHash,
        uint32 snapshotBlock,
        uint32 snapshotIndex
    );
    event RootCancelled(uint256 indexed id, bytes32 root, string reason);
    event Paid(uint256 indexed id, address indexed account, uint128 amount);
    event PayoutFailed(uint256 indexed id, address indexed account, uint128 amount, bytes reason);
    event Refunded(uint256 indexed id, address indexed brand, uint128 amount);
    event OracleSet(address oracle);
    event GuardianSet(address guardian);

    error NotOracle();
    error NotGuardian();
    error InvalidParams();
    error WrongStatus(Status status);
    error TransferShortfall(uint256 received);
    error AllocationExceedsPool();
    error InvalidProof(address account);
    error AlreadyPaid(address account);
    error OverAllocated();
    error NothingToRefund();
    error PayoutTransferFailed(bytes reason);

    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle();
        _;
    }

    modifier onlyGuardian() {
        if (msg.sender != guardian) revert NotGuardian();
        _;
    }

    constructor(
        address owner_,
        address oracle_,
        address guardian_,
        uint64 disputeWindow_,
        uint32 minMeasurementDelay_,
        uint64 rootTimeout_,
        uint64 claimWindow_
    ) Ownable(owner_) {
        if (oracle_ == address(0) || guardian_ == address(0) || rootTimeout_ == 0 || claimWindow_ == 0) {
            revert InvalidParams();
        }
        oracle = oracle_;
        guardian = guardian_;
        disputeWindow = disputeWindow_;
        minMeasurementDelay = minMeasurementDelay_;
        rootTimeout = rootTimeout_;
        claimWindow = claimWindow_;
        emit OracleSet(oracle_);
        emit GuardianSet(guardian_);
    }

    // ------------------------------------------------------------------ brand

    /// @notice Escrow `p.pool` of `p.token` and open a campaign. Requires a prior `approve` (precompile or ERC-20).
    function createCampaign(CampaignParams calldata p) external nonReentrant returns (uint256 id) {
        if (
            address(p.token) == address(0) || p.pool == 0 || p.capPerCreator == 0 || p.start >= p.end
                || p.end <= block.timestamp || p.measurementDelay < minMeasurementDelay
        ) revert InvalidParams();

        id = ++campaignCount;
        Campaign storage c = _campaigns[id];
        c.brand = msg.sender;
        c.token = p.token;
        c.pool = p.pool;
        c.start = p.start;
        c.end = p.end;
        c.measurementDelay = p.measurementDelay;
        c.capPerCreator = p.capPerCreator;
        c.minViews = p.minViews;
        c.rulesHash = p.rulesHash;

        uint256 before = p.token.balanceOf(address(this));
        p.token.safeTransferFrom(msg.sender, address(this), p.pool);
        uint256 received = p.token.balanceOf(address(this)) - before;
        if (received != p.pool) revert TransferShortfall(received);

        emit CampaignCreated(
            id, msg.sender, p.token, p.pool, p.start, p.end, p.measurementDelay, p.capPerCreator, p.minViews, p.rulesHash
        );
    }

    /// @notice Return whatever the brand is owed: the unallocated remainder once payouts are final, everything still
    /// unclaimed once the claim window has expired, or the whole pool if no root was posted in time.
    function refund(uint256 id) external nonReentrant returns (uint128 amount) {
        Campaign storage c = _campaigns[id];
        amount = refundable(id);
        if (amount == 0) revert NothingToRefund();
        c.refunded += amount;
        c.token.safeTransfer(c.brand, amount);
        emit Refunded(id, c.brand, amount);
    }

    // ------------------------------------------------------------- oracle/guardian

    /// @notice Post the payout root. `snapshotHash` is the blake2-256 content hash of the view snapshot stored at
    /// (`snapshotBlock`, `snapshotIndex`) in Portaldot `TransactionStorage`, so anyone can recompute the root.
    function postRoot(
        uint256 id,
        bytes32 root,
        uint128 totalAllocated,
        bytes32 snapshotHash,
        uint32 snapshotBlock,
        uint32 snapshotIndex
    ) external onlyOracle {
        Status s = status(id);
        if (s != Status.AwaitingRoot) revert WrongStatus(s);
        Campaign storage c = _campaigns[id];
        if (root == bytes32(0)) revert InvalidParams();
        if (totalAllocated > c.pool) revert AllocationExceedsPool();

        c.root = root;
        c.totalAllocated = totalAllocated;
        c.snapshotHash = snapshotHash;
        c.snapshotBlock = snapshotBlock;
        c.snapshotIndex = snapshotIndex;
        c.rootPostedAt = uint64(block.timestamp);
        emit RootPosted(id, root, totalAllocated, snapshotHash, snapshotBlock, snapshotIndex);
    }

    /// @notice Cancel a bad root during the dispute window; the oracle can then post a corrected one.
    function cancelRoot(uint256 id, string calldata reason) external onlyGuardian {
        Status s = status(id);
        if (s != Status.Disputable) revert WrongStatus(s);
        Campaign storage c = _campaigns[id];
        bytes32 old = c.root;
        delete c.root;
        delete c.totalAllocated;
        delete c.snapshotHash;
        delete c.snapshotBlock;
        delete c.snapshotIndex;
        delete c.rootPostedAt;
        emit RootCancelled(id, old, reason);
    }

    function setOracle(address oracle_) external onlyOwner {
        if (oracle_ == address(0)) revert InvalidParams();
        oracle = oracle_;
        emit OracleSet(oracle_);
    }

    function setGuardian(address guardian_) external onlyOwner {
        if (guardian_ == address(0)) revert InvalidParams();
        guardian = guardian_;
        emit GuardianSet(guardian_);
    }

    // ---------------------------------------------------------------- payouts

    /// @notice Pay one creator. Anyone may call; funds always go to `account`. Reverts if the transfer fails.
    function payout(uint256 id, address account, uint128 amount, bytes32[] calldata proof) external nonReentrant {
        Campaign storage c = _campaigns[id];
        _requirePayable(id);
        _verifyAndMark(id, c, account, amount, proof);
        (bool ok, bytes memory reason) = _tryTransfer(c.token, account, amount);
        if (!ok) revert PayoutTransferFailed(reason);
        emit Paid(id, account, amount);
    }

    /// @notice Push many payouts. A recipient whose transfer fails (e.g. a native-asset account that cannot be
    /// created) is skipped and stays claimable, so one bad recipient never blocks the batch. Invalid proofs revert.
    function payoutMany(uint256 id, Payout[] calldata payouts) external nonReentrant returns (uint256 paid) {
        Campaign storage c = _campaigns[id];
        _requirePayable(id);
        for (uint256 i; i < payouts.length; ++i) {
            Payout calldata p = payouts[i];
            if (isPaid[id][p.account]) continue;
            _verifyAndMark(id, c, p.account, p.amount, p.proof);
            (bool ok, bytes memory reason) = _tryTransfer(c.token, p.account, p.amount);
            if (ok) {
                ++paid;
                emit Paid(id, p.account, p.amount);
            } else {
                isPaid[id][p.account] = false;
                c.claimed -= p.amount;
                emit PayoutFailed(id, p.account, p.amount, reason);
            }
        }
    }

    // ------------------------------------------------------------------ views

    function getCampaign(uint256 id) external view returns (Campaign memory) {
        return _campaigns[id];
    }

    function status(uint256 id) public view returns (Status) {
        Campaign storage c = _campaigns[id];
        if (c.brand == address(0)) return Status.None;
        uint256 t = block.timestamp;
        if (t < c.start) return Status.Scheduled;
        if (t < c.end) return Status.Open;
        uint256 measured = uint256(c.end) + c.measurementDelay;
        if (t < measured) return Status.Measuring;
        if (c.root == bytes32(0)) {
            return t < measured + rootTimeout && c.refunded == 0 ? Status.AwaitingRoot : Status.Abandoned;
        }
        uint256 final_ = uint256(c.rootPostedAt) + disputeWindow;
        if (t < final_) return Status.Disputable;
        if (t < final_ + claimWindow) return Status.Payable;
        return Status.Expired;
    }

    /// @notice Amount the brand can currently withdraw via `refund`.
    function refundable(uint256 id) public view returns (uint128) {
        Campaign storage c = _campaigns[id];
        Status s = status(id);
        uint128 owed;
        if (s == Status.Abandoned) owed = c.pool;
        else if (s == Status.Payable) owed = c.pool - c.totalAllocated;
        else if (s == Status.Expired) owed = c.pool - c.claimed;
        return owed > c.refunded ? owed - c.refunded : 0;
    }

    /// @notice Leaf format shared with `@reachpot/allocation` (OpenZeppelin StandardMerkleTree, `address,uint256`).
    function leaf(address account, uint256 amount) public pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(account, amount))));
    }

    // --------------------------------------------------------------- internal

    function _requirePayable(uint256 id) private view {
        Status s = status(id);
        if (s != Status.Payable) revert WrongStatus(s);
    }

    function _verifyAndMark(uint256 id, Campaign storage c, address account, uint128 amount, bytes32[] calldata proof)
        private
    {
        if (isPaid[id][account]) revert AlreadyPaid(account);
        if (!MerkleProof.verifyCalldata(proof, c.root, leaf(account, amount))) revert InvalidProof(account);
        isPaid[id][account] = true;
        c.claimed += amount;
        if (c.claimed > c.totalAllocated) revert OverAllocated();
    }

    /// @dev SafeERC20.safeTransfer semantics, but reports failure instead of reverting. Native-asset precompiles revert
    /// when the recipient account cannot be created; an empty return is only accepted from an address with code.
    function _tryTransfer(IERC20 token, address to, uint256 amount) private returns (bool ok, bytes memory ret) {
        (ok, ret) = address(token).call(abi.encodeCall(IERC20.transfer, (to, amount)));
        if (!ok) return (ok, ret);
        ok = ret.length == 0 ? address(token).code.length != 0 : ret.length == 32 && abi.decode(ret, (bool));
    }
}
