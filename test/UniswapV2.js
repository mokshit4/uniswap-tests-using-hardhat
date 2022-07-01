const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const bn = require("../node_modules/bignumber.js");

describe("UniswapV2", function(){
    let UniswapV2FactoryContract;
    let uniswapv2factory;
    let pairAddress;
    let owner;
    let addr1;
    let addr2;
    let ERC20_1;
    let ERC20_2;
    let pair;
    let Token0;
    let Token1;

    // beforeEach(async function () {
        // uniswapv2factory = await ethers.getContractFactory("UniswapV2Factory");
        // [owner, addr1, addr2] = await ethers.getSigners();
        
        // UniswapV2FactoryContract = await uniswapv2factory.deploy(owner.address);
        // console.log("the uniswapv2factory contract address: ", UniswapV2FactoryContract.address);
    // });

    // it("deployment check", async function () {
    //         expect(owner.address).to.equal(await UniswapV2FactoryContract.feeToSetter());
    //         expect(await UniswapV2FactoryContract.allPairsLength()).to.equal(0);
    //         expect(await UniswapV2FactoryContract.feeTo()).to.equal(constants.ZERO_ADDRESS);

    // });
    async function sendToken(_sender, _amount0, _amount1){
        //send token balances to pair contract 10-10 and also check received
        await expect(ERC20_1.connect(_sender).transfer(pairAddress, _amount0))
        .to.emit(ERC20_1, "Transfer")
        .withArgs(owner.address, pairAddress, _amount0);
        
        await expect(ERC20_2.connect(_sender).transfer(pairAddress, _amount1))
        .to.emit(ERC20_2, "Transfer")
        .withArgs(owner.address, pairAddress, _amount1);

    }
    
    it("create pair", async function(){
        //uniswap factory contract 
        uniswapv2factory = await ethers.getContractFactory("UniswapV2Factory");
        // address initialization
        [owner, addr1, addr2] = await ethers.getSigners();
        //factory contract deployed
        UniswapV2FactoryContract = await uniswapv2factory.deploy(owner.address);
        console.log("the uniswapv2factory contract address: ", UniswapV2FactoryContract.address);

        //erc20 factory
        const ERC20Factory = await ethers.getContractFactory("ERC20");
        //two erc20 tokens deployed
        const totalSupply = BigNumber.from("1000000000000000000000000");
        ERC20_1 = await ERC20Factory.deploy("Test1", "T1", totalSupply);
        ERC20_2 = await ERC20Factory.deploy("Test2", "T2", totalSupply);
        //check owner tokens balance
        expect(await ERC20_1.balanceOf(owner.address)).to.equal(totalSupply);
        expect(await ERC20_2.balanceOf(owner.address)).to.equal(totalSupply);

        let address1,address2;
        [address1,address2] = [ERC20_1.address, ERC20_2.address];

        let token0, token1;
        //token contract sorted
        [token0, token1] = ((address1 > address2) ? [address2, address1]:[address1, address2]);
        console.log("token0 contact address: ", token0);
        console.log("token1 contract address: ", token1);
        
        //prepartion for create2 address computation
        //salt passed in the contract (using keccak256)
        const salt  = await ethers.utils.solidityKeccak256(["address", "address"],[token0, token1]);

        console.log("salt: ", salt);
        //Pair contract factory
        const UniswapV2PairFactory = await ethers.getContractFactory("contracts/UniswapV2Pair.sol:UniswapV2Pair");
        
        // pair contract bytecode(after hashinh using keccak256)
        const pairBytecode = await ethers.utils.solidityKeccak256(["bytes"],[UniswapV2PairFactory.bytecode]);
        console.log("bytecode: ", pairBytecode);
        //pair contract address computed
        pairAddress = await ethers.utils.getAddress("0x" + (await ethers.utils.solidityKeccak256(["bytes1", "address", "bytes32", "bytes32"],[0xff, UniswapV2FactoryContract.address, salt, pairBytecode])).slice(-40));

        console.log("pair contract address: ", pairAddress);
        //create Pair and also check the event emitted(token0, token1, pairAddress, length of allPairs)
        await expect(UniswapV2FactoryContract.createPair(token0, token1))
        .to.emit(UniswapV2FactoryContract, "PairCreated")
        .withArgs(token0, token1, pairAddress, 1);
        
        //pair contract instance
        pair = UniswapV2PairFactory.attach(pairAddress);
        //BigNumber for 0
        const zero = BigNumber.from(0);
        //check reserves using getReserves function (returns reserve0, reserve1, blockTimestampLast)
        expect(await pair.getReserves()).to.eql([zero, zero, 0]);
        //check tokenAddresses
        expect([await pair.token0(), await pair.token1()]).to.eql([token0, token1]);
        //check price and kLast
        expect([await pair.price0CumulativeLast(), await pair.price1CumulativeLast(), await pair.kLast()]).to.eql([zero, zero, zero]);
        //check factory address stored in pair contract
        expect(await pair.factory()).to.equal(UniswapV2FactoryContract.address);

        //sende token
        const tokenTransferAmount0 = BigNumber.from("1000000000000000000000");
        await sendToken(owner, tokenTransferAmount0, tokenTransferAmount0);
        
        //minting
        expect(await pair.mint(owner.address))
        .to.emit(pair, "Mint")
        .withArgs(owner.address, tokenTransferAmount0, tokenTransferAmount0);

        //check total supply
        const totalSupply0 = tokenTransferAmount0;
        expect(await pair.totalSupply()).to.equal(totalSupply0);
        //check lp token balance of liquidity provider
        const LpBalance0 = tokenTransferAmount0.sub(1000);
        expect(await pair.balanceOf(owner.address)).to.equal(LpBalance0);
        // console.log("feeTo: ", await UniswapV2FactoryContract.feeTo());
        // console.log("reserves: ", await pair.getReserves());

        
        //send token balances to pair contract 10-10 and also check received
        const tokenTransferAmount1 = BigNumber.from("100000000000000000000");
        await sendToken(owner, tokenTransferAmount1, tokenTransferAmount1);
        //minting
        expect(await pair.mint(owner.address))
        .to.emit(pair, "Mint")
        .withArgs(owner.address, tokenTransferAmount1, tokenTransferAmount1);
        
        //check totalsupply
        const totalSupply1 = totalSupply0.add(tokenTransferAmount1);
        expect(await pair.totalSupply()).to.equal(totalSupply1);

        //check the lp token balance of liquidity provider
        const LpBalance1 = LpBalance0.add(tokenTransferAmount1);
        expect(await pair.balanceOf(owner.address)).to.equal(LpBalance1);

        //set feeTo address in factory contract
        await UniswapV2FactoryContract.setFeeTo(addr1.address);

        //check feeTo address
        expect(await UniswapV2FactoryContract.feeTo()).to.equal(addr1.address);

        //send Tokens
        const tokenTransferAmount2 = BigNumber.from("10000000000000000000");
        await sendToken(owner, tokenTransferAmount2, tokenTransferAmount2);

        //mint (and check mintFee function)
        await expect(pair.mint(owner.address))
        .to.emit(pair, "Mint")
        .withArgs(owner.address, tokenTransferAmount2, tokenTransferAmount2);

        //check totalSupply
        const totalSupply2 = totalSupply1.add(tokenTransferAmount2);
        expect(await pair.totalSupply()).to.equal(totalSupply2);

        //check lpTokenBalance of liquidity provider
        const LpBalance2 = LpBalance1.add(tokenTransferAmount2);
        expect(await pair.balanceOf(owner.address)).to.equal(LpBalance2);

        //check LpTokenBalance of addr1
        expect(await pair.balanceOf(addr1.address)).to.equal(0);

        //check kLast??
        expect(await pair.kLast()).to.equal(totalSupply2.mul(totalSupply2));

        //send Tokens
        const tokenTransferAmount3 = BigNumber.from("1000000000000000000");
        await sendToken(owner, tokenTransferAmount3, tokenTransferAmount3);

        //mint in mintFee{k = klast} therfore no change
        await expect(pair.mint(owner.address))
        .to.emit(pair, "Mint")
        .withArgs(owner.address, tokenTransferAmount3, tokenTransferAmount3);
        //totalsupply check
        const totalSupply3 = totalSupply2.add(tokenTransferAmount3);
        expect(await pair.totalSupply()).to.equal(totalSupply3);

        
        //lp tokens check liquidity provider
        const LpBalance3 = LpBalance2.add(tokenTransferAmount3);
        expect(await pair.balanceOf(owner.address)).to.equal(LpBalance3);

        //lp token in addre=1(since k == klast)
        expect(await pair.balanceOf(addr1.address)).to.equal(0);

        //SWAP

        Token0 = ERC20Factory.attach(token0);
        const amount0In = BigNumber.from("10000000000000000000");
        //send token0 from owner to addr2
        await expect(Token0.transfer(addr2.address, amount0In))
        .to.emit(Token0, "Transfer")
        .withArgs(owner.address, addr2.address, amount0In);
        //send token0 from addr2 to pair contract for swapping
        await expect(Token0.connect(addr2).transfer(pairAddress, amount0In))
        .to.emit(Token0, "Transfer")
        .withArgs(addr2.address, pairAddress, amount0In);
        //call swap function
        const amount1Out = BigNumber.from("9800000000000000000");
        await expect(pair.connect(addr2).swap(zero, amount1Out, addr2.address, []))
        .to.emit(pair, "Swap")
        .withArgs(addr2.address, amount0In, 0, 0, amount1Out, addr2.address);

        // SWAP failing
        Token1 = ERC20Factory.attach(token1);
        const amount1In = BigNumber.from("10000000000000000000");
        //token1 transferred from owner to pair contract
        await expect(Token1.transfer(pairAddress, amount1In))
        .to.emit(Token1, "Transfer")
        .withArgs(owner.address, pairAddress, amount1In);
        //swap call
        const amount0Out = BigNumber.from("10100000000000000000")
        await expect(pair.swap(amount0Out, zero, addr2.address, []))
        .to.be.revertedWith("UniswapV2: K");
        
        // .emit(pair, "Swap")
        // .withArgs(owner.address, 0, amount1In, amount0Out, 0, addr2.address);

        //BURN
        const burnAmount0 = BigNumber.from("1000000000000000000").sub(1000);
        const reserve0 = totalSupply3.add(amount0In);
        const reserve1 = totalSupply3.sub(amount1Out);
        // console.log("balance0: ", await Token0.balanceOf(pairAddress));
        // console.log("balance0Computed: ", totalSupply3.add(amount0In));
        // console.log()
        //calculate effect of Mintfee on total supply
        const rootK = BigNumber.from(new bn((reserve0.mul(reserve1)).toString()).sqrt().toFixed().split('.')[0]);
        const rootKLast = totalSupply3;
        const five = BigNumber.from(5);
        const fee = rootK.sub(rootKLast).mul(totalSupply3).div(rootK.mul(five).add(rootKLast));
        console.log("fee: ", fee);
        const totalSupply4 = totalSupply3.add(fee);
        
        //
        expect(reserve0).to.equal(await Token0.balanceOf(pairAddress));
        const amount0 = burnAmount0.mul(reserve0).div(totalSupply4);
        const amount1 = burnAmount0.mul(reserve1.add(amount1In)).div(totalSupply4);
        console.log("LpBalance of owner: ", await pair.balanceOf(owner.address));
        //check lp balance of addr1
        expect(await pair.balanceOf(addr1.address)).to.equal(0);
        //sendLptoken back to pair contract for burning
        await expect(pair.transfer(pairAddress, burnAmount0))
        .to.emit(pair, "Transfer")
        .withArgs(owner.address, pairAddress, burnAmount0);
        //call burn function
        await expect(pair.burn(owner.address))
        .to.emit(pair, "Burn")
        .withArgs(owner.address, amount0, amount1, owner.address);

        //check fee paid to feeTo(addr1)
        expect(await pair.balanceOf(addr1.address)).to.equal(fee);

        // await pair.skim(addr1.address);
        // console.log("balances of pair contract, token0: %s, token1: %s", await ERC20_1.balanceOf(pairAddress), await ERC20_2.balanceOf(pairAddress));

        // //update pair contract using sync function

        // expect(await pair.sync())
        // .to.emit(pair, "Sync")
        // .withArgs(10, 10);

        // console.log("blocktimestamp1: ",(await pair.getReserves())[2]);

        // expect([await pair.price0CumulativeLast(), await pair.price1CumulativeLast()]).to.eql([zero, zero]);
        
        // //send token balances to pair contract 10-10 and also check received
        // expect(await ERC20_1.transfer(pairAddress, 10))
        // .to.emit(ERC20_1, "Transfer") 
        // .withArgs(owner.address, pairAddress, 10);
                
        // expect(await ERC20_2.transfer(pairAddress, 10))
        // .to.emit(ERC20_2, "Transfer")
        // .withArgs(owner.address, pairAddress, 10);
        
        // //update the pair contract once again and now check the prices

        // expect(await pair.sync())
        // .to.emit(pair, "Sync")
        // .withArgs(20 , 20);

        // console.log("price0Cumulativelast: ", await pair.price0CumulativeLast());
        // console.log("price1Cumulativelast: ", await pair.price1CumulativeLast());

        // console.log("Blocktimestamp2: ", (await pair.getReserves())[2]);
        // // console.log(BigNumber.from(JSON.stringify(Math.pow(2,112))));


    });
    
});