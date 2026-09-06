import { ethers } from 'ethers';

// Wahi address jo aapke terminal mein deploy hone par aaya tha
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Minimal ABI (Sirf wo function jo hume call karna hai)
const MINIMAL_ABI = [
  "function storeProof(bytes32 _proofHash) public",
  "function verifyProof(bytes32 _proofHash) public view returns (bool exists, uint256 timestamp)"
];

export async function anchorProofToBlockchain(hashHex) {
  // 1. Local Hardhat Node se connect karein
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  // 2. Default Hardhat test account use karein transaction sign karne ke liye
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const wallet = new ethers.Wallet(privateKey, provider);

  // 3. Contract ka instance banayein
  const contract = new ethers.Contract(CONTRACT_ADDRESS, MINIMAL_ABI, wallet);

  // Solidity ko 0x format mein data chahiye hota hai
  const formattedHash = "0x" + hashHex;

  console.log("Sending transaction to blockchain...");
  
  // 4. Contract ka function call karein
  const tx = await contract.storeProof(formattedHash);
  
  // 5. Wait karein jab tak transaction block mein add na ho jaye
  await tx.wait(); 

  return tx.hash; // Yeh Transaction ID (TxHash) hai
}