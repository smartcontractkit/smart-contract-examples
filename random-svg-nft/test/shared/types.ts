import { Fixture } from "ethereum-waffle";
import { Wallet } from "@ethersproject/wallet";
import { EmojiNFT, VRFCoordinatorV2Mock } from "../../typechain";

declare module "mocha" {
  export interface Context {
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    signers: Signers;
    emojiNft: EmojiNFT;
    vrfCoordinatorMock: VRFCoordinatorV2Mock;
  }
}

export interface Signers {
  deployer: Wallet;
  alice: Wallet;
  bob: Wallet;
}
