import { waffle } from "hardhat";
import { unitEmojiNftFixture } from "../shared/fixtures";
import { Signers } from "../shared/types";
import { shouldMint } from "./EmojiNFT/EmojiNFTShouldMint.spec";

describe(`Unit tests`, async () => {
  before(async function () {
    const wallets = waffle.provider.getWallets();

    this.signers = {} as Signers;
    this.signers.deployer = wallets[0];
    this.signers.alice = wallets[1];
    this.signers.bob = wallets[2];

    this.loadFixture = waffle.createFixtureLoader(wallets);
  });

  describe(`EmojiNFT`, async () => {
    beforeEach(async function () {
      const { emojiNft, vrfCoordinatorMock } = await this.loadFixture(
        unitEmojiNftFixture
      );

      this.emojiNft = emojiNft;
      this.vrfCoordinatorMock = vrfCoordinatorMock;
    });

    shouldMint();
  });
});
