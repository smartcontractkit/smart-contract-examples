import { Fixture } from "ethereum-waffle";
import { Wallet } from "@ethersproject/wallet";
import { EmojiNFT, LinkToken, VRFCoordinatorMock } from "../../typechain";

declare module "mocha" {
  export interface Context {
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    signers: Signers;
    emojiNft: EmojiNFT;
    vrfCoordinatorMock: VRFCoordinatorMock;
    linkToken: LinkToken;
  }
}

export interface Signers {
  deployer: Wallet;
  alice: Wallet;
  bob: Wallet;
}
