/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@nomiclabs/hardhat-waffle");
module.exports = {
  solidity: "0.5.16",
  networks: {
    rinkeby : {
      url: "https://eth-rinkeby.alchemyapi.io/v2/-fHpk0TIHE6QsPqpX7uKaGQzOgUg1zbp",
      accounts: ["0x72da13c6d14636da23f7bd00a04f536c821d1d4100a7f2c9b38f741f023d7970"]
    }
  }
};
