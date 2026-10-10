const { expect } = require("chai");
const { ethers } = require("hardhat");

const SUPPLY = ethers.parseUnits("100000000", 18);

describe("TradingBibleCoin", function () {
  it("mints exactly 100M TBC to the treasury, nothing else", async function () {
    const [treasury, other] = await ethers.getSigners();
    const TBC = await ethers.getContractFactory("TradingBibleCoin");
    const tbc = await TBC.deploy(treasury.address);
    expect(await tbc.totalSupply()).to.equal(SUPPLY);
    expect(await tbc.balanceOf(treasury.address)).to.equal(SUPPLY);
    expect(await tbc.balanceOf(other.address)).to.equal(0);
    expect(await tbc.name()).to.equal("TradingBible Coin");
    expect(await tbc.symbol()).to.equal("TBC");
    expect(await tbc.decimals()).to.equal(18);
  });

  it("rejects the zero treasury", async function () {
    const TBC = await ethers.getContractFactory("TradingBibleCoin");
    await expect(TBC.deploy(ethers.ZeroAddress)).to.be.revertedWith("TBC: zero treasury");
  });

  it("transfers normally (plain ERC-20, no fees/taxes)", async function () {
    const [treasury, alice] = await ethers.getSigners();
    const TBC = await ethers.getContractFactory("TradingBibleCoin");
    const tbc = await TBC.deploy(treasury.address);
    const amt = ethers.parseUnits("1000", 18);
    await tbc.transfer(alice.address, amt);
    expect(await tbc.balanceOf(alice.address)).to.equal(amt);
  });
});

describe("TBVestingWallet", function () {
  async function fixture() {
    const [treasury, beneficiary] = await ethers.getSigners();
    const TBC = await ethers.getContractFactory("TradingBibleCoin");
    const tbc = await TBC.deploy(treasury.address);
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const Vesting = await ethers.getContractFactory("TBVestingWallet");
    // 30-day cliff, 365-day linear schedule starting in 1 hour.
    const vesting = await Vesting.deploy(
      await tbc.getAddress(),
      beneficiary.address,
      now + 3600,
      30 * 86400,
      365 * 86400
    );
    const grant = ethers.parseUnits("15000000", 18);
    await tbc.transfer(await vesting.getAddress(), grant);
    return { tbc, vesting, treasury, beneficiary, grant };
  }

  it("locks everything before the cliff", async function () {
    const { vesting, beneficiary } = await fixture();
    expect(await vesting.vested()).to.equal(0n);
    await expect(vesting.release()).to.be.revertedWithCustomError(vesting, "CliffNotReached");
    expect(await vesting.released()).to.equal(0n);
    void beneficiary;
  });

  it("releases linearly and fully vests at the end", async function () {
    const { tbc, vesting, beneficiary, grant } = await fixture();
    // Jump past cliff + half duration (~6 months in).
    await ethers.provider.send("evm_increaseTime", [200 * 86400]);
    await ethers.provider.send("evm_mine");
    const half = await vesting.vested();
    expect(half > 0n).to.equal(true);
    expect(half < grant).to.equal(true);
    await vesting.release();
    const paid = await tbc.balanceOf(beneficiary.address);
    // Release tx mines one more block, so a second of vesting accrues.
    expect(paid >= half).to.equal(true);
    expect(paid <= half + grant / 1000n).to.equal(true);
    // Jump past the end: remainder unlocks.
    await ethers.provider.send("evm_increaseTime", [200 * 86400]);
    await ethers.provider.send("evm_mine");
    await vesting.release();
    expect(await tbc.balanceOf(beneficiary.address)).to.equal(grant);
  });

  it("rejects zero addresses and bad schedules", async function () {
    const [treasury, beneficiary] = await ethers.getSigners();
    const TBC = await ethers.getContractFactory("TradingBibleCoin");
    const tbc = await TBC.deploy(treasury.address);
    const Vesting = await ethers.getContractFactory("TBVestingWallet");
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await expect(
      Vesting.deploy(ethers.ZeroAddress, beneficiary.address, now, 0, 100)
    ).to.be.revertedWith("TBV: zero address");
    await expect(
      Vesting.deploy(await tbc.getAddress(), beneficiary.address, now, 200, 100)
    ).to.be.revertedWith("TBV: cliff > duration");
  });
});
