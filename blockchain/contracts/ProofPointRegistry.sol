// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ProofPointRegistry {
    // Event jo emit hoga jab bhi naya proof blockhcain par save hoga
    event ProofAnchored(bytes32 indexed proofHash, uint256 timestamp, address submitter);

    // Ye mapping (dictionary) hash ko store karegi
    mapping(bytes32 => uint256) public proofs;

    // 1. Function: Hash ko blockchain par save karna
    function storeProof(bytes32 _proofHash) public {
        // Check karna ki ye proof pehle se toh nahi hai
        require(proofs[_proofHash] == 0, "Proof already exists on blockchain!");
        
        // Block ka current time save karna
        proofs[_proofHash] = block.timestamp;
        
        // Log emit karna
        emit ProofAnchored(_proofHash, block.timestamp, msg.sender);
    }

    // 2. Function: Check karna ki hash exist karta hai ya nahi (Proof Verification ke liye)
    function verifyProof(bytes32 _proofHash) public view returns (bool exists, uint256 timestamp) {
        uint256 time = proofs[_proofHash];
        if (time > 0) {
            return (true, time);
        }
        return (false, 0);
    }
}