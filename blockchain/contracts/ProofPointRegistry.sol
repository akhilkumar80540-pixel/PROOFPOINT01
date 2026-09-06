// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProofRegistry {
    address public owner;

    struct EventRecord {
        bytes32 merkleRoot;
        uint256 totalAttendees;
        uint256 anchoredAt;
    }

    // eventId (string or bytes32) => EventRecord
    mapping(string => EventRecord) public eventRecords;

    event EventAnchored(
        string indexed eventId,
        bytes32 indexed merkleRoot,
        uint256 totalAttendees,
        uint256 timestamp
    );

    constructor() {
        owner = msg.sender;
    }

    /// @notice Anchors the Merkle root of all verified attendees for an event
    function anchorEventBatch(
        string memory eventId,
        bytes32 merkleRoot,
        uint256 totalAttendees
    ) external {
        require(eventRecords[eventId].merkleRoot == bytes32(0), "Event already anchored");
        require(totalAttendees > 0, "No attendees to anchor");

        eventRecords[eventId] = EventRecord({
            merkleRoot: merkleRoot,
            totalAttendees: totalAttendees,
            anchoredAt: block.timestamp
        });

        emit EventAnchored(eventId, merkleRoot, totalAttendees, block.timestamp);
    }

    /// @notice Verifies whether a specific attendee hash belongs to the event's anchored root
    function verifyProofMembership(
        string memory eventId,
        bytes32 leafHash,
        bytes32[] memory proof
    ) external view returns (bool) {
        bytes32 root = eventRecords[eventId].merkleRoot;
        require(root != bytes32(0), "Event not anchored yet");

        bytes32 computedHash = leafHash;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == root;
    }
}