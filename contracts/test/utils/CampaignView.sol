// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Reachpot} from "../../src/Reachpot.sol";

/// @notice Decodes the `campaigns(id)` auto-getter tuple back into the Campaign struct for assertions.
library CampaignView {
    function get(Reachpot rp, uint256 id) internal view returns (Reachpot.Campaign memory c) {
        (
            c.brand,
            c.start,
            c.measurementDelay,
            c.token,
            c.end,
            c.pool,
            c.totalAllocated,
            c.claimed,
            c.refunded,
            c.capPerCreator,
            c.minViews,
            c.rootPostedAt,
            c.rulesHash,
            c.root,
            c.snapshotHash,
            c.snapshotBlock,
            c.snapshotIndex
        ) = rp.campaigns(id);
    }
}
