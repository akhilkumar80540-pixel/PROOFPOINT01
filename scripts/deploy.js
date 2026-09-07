import hre from "hardhat";

async function main() {
  console.log("Deploying ProofRegistry to target network...");

  // Gets the contract factory directly using Hardhat's built-in runtime
  const ProofRegistry = await hre.ethers.getContractFactory("ProofRegistry");
  const contract = await ProofRegistry.deploy();

  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log(`ProofRegistry deployed to: ${deployedAddress}`);
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});