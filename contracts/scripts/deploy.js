const { ethers, network } = require("hardhat");

// Usage:
//   DEPLOYER_KEY=0x... TREASURY=0x... npx hardhat run scripts/deploy.js --network baseSepolia
// Treasury should be the multisig. Prints the TBC address to set as
// TBC_CONTRACT_BASE (or TBC_CONTRACT_ETHEREUM) in apps/api/.env.
async function main() {
  const treasury = process.env.TREASURY;
  if (!treasury || !ethers.isAddress(treasury)) {
    throw new Error("Set TREASURY=0x... (multisig address) in the environment");
  }
  const [deployer] = await ethers.getSigners();
  console.log(`Network: ${network.name} | deployer: ${deployer.address} | treasury: ${treasury}`);

  const TBC = await ethers.getContractFactory("TradingBibleCoin");
  const tbc = await TBC.deploy(treasury);
  await tbc.waitForDeployment();
  const addr = await tbc.getAddress();
  console.log(`TradingBibleCoin deployed at: ${addr}`);
  console.log(`Supply: ${ethers.formatUnits(await tbc.totalSupply(), 18)} TBC`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
