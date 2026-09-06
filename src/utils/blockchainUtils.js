import { ethers } from 'ethers';

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const MINIMAL_ABI = [
  "function storeProof(bytes32 _proofHash) public",
  "function verifyProof(bytes32 _proofHash) public view returns (bool exists, uint256 timestamp)"
];

export async function anchorProofToBlockchain(hashHex) {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, MINIMAL_ABI, wallet);

  const formattedHash = "0x" + hashHex;
  const tx = await contract.storeProof(formattedHash);
  await tx.wait(); 
  return tx.hash;
}

// Third-party verification directly against Smart Contract
export async function verifyProofOnChain(hashHex) {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, MINIMAL_ABI, provider);

  const formattedHash = "0x" + hashHex;
  const result = await contract.verifyProof(formattedHash);
  
  return {
    exists: result.exists,
    blockTimestamp: Number(result.timestamp)
  };
}