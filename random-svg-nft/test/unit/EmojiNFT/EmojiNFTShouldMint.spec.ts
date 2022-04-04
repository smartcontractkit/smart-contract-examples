import { expect, assert } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

export const shouldMint = (): void => {
  // to silent warning for duplicate definition of Transfer event
  ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.OFF);

  context(`#mint`, async function () {
    it(`should mint new NFT`, async function () {
      const requestId: BigNumber = await this.emojiNft.callStatic.mint();

      await expect(this.emojiNft.connect(this.signers.alice).mint())
        .to.emit(this.emojiNft, `RandomnessRequested`)
        .withArgs(requestId);

      await this.vrfCoordinatorMock.fulfillRandomWords(
        requestId,
        this.emojiNft.address
      );

      const aliceBalance: BigNumber = await this.emojiNft.balanceOf(
        this.signers.alice.address
      );

      assert(aliceBalance.eq(ethers.constants.One));
    });
  });
};
