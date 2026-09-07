import { ethers } from 'ethers';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0xa8a382A1F2D9cFB2978F86f496483B91c01cAC50";
const SEPOLIA_RPC_URL = import.meta.env.VITE_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7"; // 11155111

export const MINIMAL_ABI = [
  "function storeProof(bytes32 _proofHash) public",
  "function verifyProof(bytes32 _proofHash) public view returns (bool exists, uint256 timestamp)"
];

// Helper: Ensure MetaMask is on Sepolia
async function ensureSepoliaNetwork() {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: SEPOLIA_CHAIN_ID_HEX,
            chainName: "Sepolia Test Network",
            rpcUrls: [SEPOLIA_RPC_URL],
            nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
      });
    }
  }
}

// 1. Connect Wallet
export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask extension.");
  }
  await ensureSepoliaNetwork();
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  return accounts[0];
}

// 2. Anchor Proof (Uses raw transaction call - zero Ethers.js internal RPC polling)
export async function anchorProofWithMetaMask(hashHex) {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed.");
  }
  await ensureSepoliaNetwork();

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const userAddress = accounts[0];

  // Format proof hash to 32-byte hex
  const cleanHash = hashHex.startsWith("0x") ? hashHex.slice(2) : hashHex;
  const formattedHash = "0x" + cleanHash.padStart(64, "0");

  // Encode function data for storeProof(bytes32)
  const iface = new ethers.Interface(MINIMAL_ABI);
  const data = iface.encodeFunctionData("storeProof", [formattedHash]);

  // Direct low-level call to MetaMask: prompts signature without triggering BrowserProvider block checks
  const txHash = await window.ethereum.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: userAddress,
        to: CONTRACT_ADDRESS,
        data: data,
        gas: "0x1D4C0" // 120,000 gas limit in hex
      }
    ]
  });

  // Confirm receipt using our direct fallback provider
  const directProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  await directProvider.waitForTransaction(txHash, 1);

  return txHash;
}

// 3. Third-party read-only verification
export async function verifyProofOnChain(hashHex) {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, MINIMAL_ABI, provider);
  const cleanHash = hashHex.startsWith("0x") ? hashHex.slice(2) : hashHex;
  const formattedHash = "0x" + cleanHash.padStart(64, "0");

  const result = await contract.verifyProof(formattedHash);
  return {
    exists: result.exists,
    blockTimestamp: Number(result.timestamp)
  };
}