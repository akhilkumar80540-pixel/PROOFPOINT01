import { ethers } from 'ethers';

export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const MINIMAL_ABI = [
  "function storeProof(bytes32 _proofHash) public",
  "function verifyProof(bytes32 _proofHash) public view returns (bool exists, uint256 timestamp)"
];

// 1. Request Wallet Connection
export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask extension.");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  return accounts[0];
}

// 2. Anchor Proof using MetaMask Signer
export async function anchorProofWithMetaMask(hashHex) {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, MINIMAL_ABI, signer);

  const formattedHash = "0x" + hashHex;
  const tx = await contract.storeProof(formattedHash);
  await tx.wait(); // Wait for block confirmation
  return tx.hash;
}

// 3. Third-party read-only verification (No gas needed)
export async function verifyProofOnChain(hashHex) {
  let provider;
  if (window.ethereum) {
    provider = new ethers.BrowserProvider(window.ethereum);
  } else {
    provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  }

  const contract = new ethers.Contract(CONTRACT_ADDRESS, MINIMAL_ABI, provider);
  const formattedHash = "0x" + hashHex;
  const result = await contract.verifyProof(formattedHash);

  return {
    exists: result.exists,
    blockTimestamp: Number(result.timestamp)
  };
}