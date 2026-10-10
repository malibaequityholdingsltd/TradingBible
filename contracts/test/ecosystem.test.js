const { expect } = require("chai");
const { ethers } = require("hardhat");

async function deployTbc(to, amount) {
  const [treasury] = await ethers.getSigners();
  const TBC = await ethers.getContractFactory("TradingBibleCoin");
  const tbc = await TBC.deploy(treasury.address);
  if (to && amount) await tbc.transfer(to, amount);
  return tbc;
}

describe("TBCStaking", function () {
  it("accrues rewards pro-rata and pays them from a funded pool", async function () {
    const [treasury, alice, bob] = await ethers.getSigners();
    const tbc = await deployTbc();
    const Staking = await ethers.getContractFactory("TBCStaking");
    const staking = await Staking.deploy(await tbc.getAddress());
    const stakeAddr = await staking.getAddress();

    // Owner funds 1000 TBC rewards, rate 1 TBC/sec.
    const rate = ethers.parseUnits("1", 18);
    await tbc.approve(stakeAddr, ethers.parseUnits("1000", 18));
    await staking.fundRewards(ethers.parseUnits("1000", 18));
    await staking.setRewardRate(rate);

    // Alice stakes 100, Bob stakes 300 → Bob earns ~3x Alice.
    for (const [user, amt] of [[alice, "100"], [bob, "300"]]) {
      await tbc.transfer(user.address, ethers.parseUnits(amt, 18));
      await tbc.connect(user).approve(stakeAddr, ethers.parseUnits(amt, 18));
      await staking.connect(user).stake(ethers.parseUnits(amt, 18));
    }
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine");

    const ea = await staking.earned(alice.address);
    const eb = await staking.earned(bob.address);
    expect(ea > 0n).to.equal(true);
    expect(eb > ea * 2n).to.equal(true);

    const before = await tbc.balanceOf(alice.address);
    await staking.connect(alice).claim();
    expect(await tbc.balanceOf(alice.address) - before).to.be.gte(ea);

    await staking.connect(alice).withdraw(ethers.parseUnits("100", 18));
    expect(await tbc.balanceOf(alice.address)).to.be.gte(ethers.parseUnits("100", 18));
  });

  it("rejects zero amounts and non-owner rate changes", async function () {
    const [, alice] = await ethers.getSigners();
    const tbc = await deployTbc();
    const Staking = await ethers.getContractFactory("TBCStaking");
    const staking = await Staking.deploy(await tbc.getAddress());
    await expect(staking.connect(alice).setRewardRate(1)).to.be.revertedWithCustomError(staking, "OnlyOwner");
    await expect(staking.connect(alice).stake(0)).to.be.revertedWithCustomError(staking, "ZeroAmount");
    await expect(staking.connect(alice).claim()).to.be.revertedWithCustomError(staking, "ZeroAmount");
  });
});

describe("TBECertificate (soulbound)", function () {
  it("mints to graduates, blocks transfers, allows burn/revoke", async function () {
    const [minter, grad, other] = await ethers.getSigners();
    const Cert = await ethers.getContractFactory("TBECertificate");
    const cert = await Cert.deploy(minter.address);

    await expect(cert.connect(other).award(grad.address, "ipfs://cert/1"))
      .to.be.revertedWithCustomError(cert, "OnlyMinter");
    await cert.award(grad.address, "ipfs://cert/1");
    expect(await cert.ownerOf(1)).to.equal(grad.address);
    expect(await cert.tokenURI(1)).to.equal("ipfs://cert/1");

    // Any transfer reverts (soulbound), including to self via transferFrom.
    await expect(cert.connect(grad).transferFrom(grad.address, other.address, 1))
      .to.be.revertedWithCustomError(cert, "Soulbound");

    // Holder can burn their own; minter can revoke.
    await cert.award(other.address, "ipfs://cert/2");
    await expect(cert.connect(other).transferFrom(other.address, grad.address, 2))
      .to.be.revertedWithCustomError(cert, "Soulbound");
    await cert.revoke(2);
    await expect(cert.ownerOf(2)).to.be.reverted;
  });
});
