export interface NetworkConfig {
  name: string;
  linkToken: string;
  verifierProxyAddress: string;
  automationRegistrarAddress: string;
  feedIds: string[];
}

export const networkConfig: Record<number, NetworkConfig> = {
  421614: {
    name: "arbitrumSepolia",
    linkToken: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
    verifierProxyAddress: "0x2ff010DEbC1297f19579B4246cad07bd24F2488A",
    automationRegistrarAddress: "0x881918E24290084409DaA91979A30e6f0dB52eBe",
    feedIds: [
      "0x000359843a543ee2fe414dc14c7e7920ef10f4372990b79d6361cdc0dd1ba782",
    ], // ETH/USD
  },
};
