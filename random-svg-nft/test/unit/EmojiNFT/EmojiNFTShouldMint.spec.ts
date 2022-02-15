import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

export const shouldMint = (): void => {
  // to silent warning for duplicate definition of Transfer event
  ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.OFF);

  context(`#mint`, function () {
    it(`should mint new NFT`, async function () {
      const requestId: string = await this.emojiNft.callStatic.mint();

      await expect(this.emojiNft.connect(this.signers.alice).mint())
        .to.emit(this.emojiNft, `RandomnessRequested`)
        .withArgs(requestId);

      // simulate callback from the Oracle network
      const randomValue: BigNumber = BigNumber.from(`777`);
      await this.vrfCoordinatorMock.callBackWithRandomness(
        requestId,
        randomValue,
        this.emojiNft.address
      );

      expect(
        await this.emojiNft.balanceOf(this.signers.alice.address)
      ).to.equal(ethers.constants.One);
    });
  });
};
