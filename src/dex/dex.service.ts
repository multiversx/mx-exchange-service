import { PairModel, PairInfoModel, TransactionModel } from './dex.model';
import { Injectable, Res } from '@nestjs/common';
import { AbiRegistry, BigUIntValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem";
import { BytesValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes";
import { H256Value } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem/h256";
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ContractFunction, ProxyProvider, Address, SmartContract, GasLimit } from '@elrondnetwork/erdjs';
import { CacheManagerService } from 'src/services/cache-manager/cache-manager.service';
import { elrondConfig } from '../config';
import BigNumber from 'bignumber.js';


@Injectable()
export class DexService {
  private readonly proxy: ProxyProvider;

  constructor(
    private cacheManagerService: CacheManagerService,
  ) {
    this.proxy = new ProxyProvider(elrondConfig.gateway, 60000);
  }

  async getAllPairs(): Promise<PairModel[]> {
    let abiRegistry = await AbiRegistry.load({ files: ["./src/elrond_dex_router.abi.json"] });
    let abi = new SmartContractAbi(abiRegistry, ["Router"]);
    let contract = new SmartContract({ address: new Address(elrondConfig.routerAddress), abi: abi });

    let getAllPairsInteraction = <Interaction>contract.methods.getAllPairs([]);

    let queryResponse = await contract.runQuery(this.proxy, { func: new ContractFunction("getAllPairs") });
    let result = getAllPairsInteraction.interpretQueryResponse(queryResponse);

    return result.values[0].valueOf().map(v => {
      return {
        token_a: v.token_a.toString(),
        token_b: v.token_b.toString(),
        address: v.address.toString(),
      }
    });
  }

  async getPairInfo(address: string): Promise<PairInfoModel> {
    let abiRegistry = await AbiRegistry.load({ files: ["./src/elrond_dex_pair.abi.json"] });
    let abi = new SmartContractAbi(abiRegistry, ["Pair"]);
    let contract = new SmartContract({ address: new Address(address), abi: abi });

    let getAllPairsInteraction = <Interaction>contract.methods.getBasicInfo([]);

    let queryResponse = await contract.runQuery(this.proxy, { func: new ContractFunction("getBasicInfo") });
    let result = getAllPairsInteraction.interpretQueryResponse(queryResponse);

    return result.values[0].valueOf();
  }

  async getAmountOut(address: string, tokenIn: string): Promise<string> {
    let abiRegistry = await AbiRegistry.load({ files: ["./src/elrond_dex_pair.abi.json"] });
    let abi = new SmartContractAbi(abiRegistry, ["Pair"]);
    let contract = new SmartContract({ address: new Address(address), abi: abi });

    let getAmoountOut = <Interaction>contract.methods.getAmountOut([
      new BigUIntValue(new BigNumber(100)),
      BytesValue.fromUTF8(tokenIn)
    ]);

    let queryResponse = await contract.runQuery(
      this.proxy,
      {
        func: new ContractFunction("getAmountOut"),
        args: [
          new BigUIntValue(new BigNumber(100)),
          BytesValue.fromUTF8(tokenIn)
        ]
      }
    );

    let result = getAmoountOut.interpretQueryResponse(queryResponse);

    return result.values[0].valueOf();

  }

  async createPair(token_a: string, token_b: string): Promise<TransactionModel> {
    let abiRegistry = await AbiRegistry.load({ files: ["./src/elrond_dex_router.abi.json"] });
    let abi = new SmartContractAbi(abiRegistry, ["Router"]);
    let contract = new SmartContract({ address: new Address(elrondConfig.routerAddress), abi: abi });
    let transaction = contract.call({
      func: new ContractFunction("createPair"),
      args: [
        BytesValue.fromUTF8(token_a),
        BytesValue.fromUTF8(token_b)
      ],
      gasLimit: new GasLimit(1400000000)
    });

    let transactionModel = transaction.toPlainObject();
    return {
      ...transactionModel,
      options: transactionModel.options == undefined ? "" : transactionModel.options,
      status: transactionModel.status == undefined ? "" : transactionModel.status,
      signature: transactionModel.signature == undefined ? "" : transactionModel.signature
    };
  }

  async issueLpToken(address: string, lpTokenName: string, lpTokenTicker: string): Promise<TransactionModel> {
    let abiRegistry = await AbiRegistry.load({ files: ["./src/elrond_dex_router.abi.json"] });
    let abi = new SmartContractAbi(abiRegistry, ["Router"]);
    let contract = new SmartContract({ address: new Address(elrondConfig.routerAddress), abi: abi });
    let transaction = contract.call({
      func: new ContractFunction("issueLpToken"),
      args: [
        BytesValue.fromHex(new Address(address).hex()),
        BytesValue.fromUTF8(lpTokenName),
        BytesValue.fromUTF8(lpTokenTicker)
      ],
      gasLimit: new GasLimit(1400000000)
    });
    console.log(transaction);
    let transactionModel = transaction.toPlainObject();
    return {
      ...transactionModel,
      options: transactionModel.options == undefined ? "" : transactionModel.options,
      status: transactionModel.status == undefined ? "" : transactionModel.status,
      signature: transactionModel.signature == undefined ? "" : transactionModel.signature
    };
  }

  async addLiquidity(address: string, amount0: number, amount1: number, amount0Min: number, amount1Min: number): Promise<TransactionModel> {
    let abiRegistry = await AbiRegistry.load({ files: ["./src/elrond_dex_pair.abi.json"] });
    let abi = new SmartContractAbi(abiRegistry, ["Pair"]);
    let contract = new SmartContract({ address: new Address(address), abi: abi });
    let transaction = contract.call({
      func: new ContractFunction("addLiquidity"),
      args: [
        new BigUIntValue(new BigNumber(amount0)),
        new BigUIntValue(new BigNumber(amount1)),
        new BigUIntValue(new BigNumber(amount0Min)),
        new BigUIntValue(new BigNumber(amount1Min)),
      ],
      gasLimit: new GasLimit(1400000000)
    });

    let transactionModel = transaction.toPlainObject();
    return {
      ...transactionModel,
      options: transactionModel.options == undefined ? "" : transactionModel.options,
      status: transactionModel.status == undefined ? "" : transactionModel.status,
      signature: transactionModel.signature == undefined ? "" : transactionModel.signature
    };
  }

  async removeLiquidity(address: string, liqidity: number, tokenID: string, amount0Min: number, amount1Min: number): Promise<TransactionModel> {

    let abiRegistry = await AbiRegistry.load({ files: ["./src/elrond_dex_pair.abi.json"] });
    let abi = new SmartContractAbi(abiRegistry, ["Pair"]);
    let contract = new SmartContract({ address: new Address(address), abi: abi });
    let transaction = contract.call({
      func: new ContractFunction("ESDTTransfer"),
      args: [
        BytesValue.fromUTF8(tokenID),
        new BigUIntValue(new BigNumber(liqidity)),
        BytesValue.fromUTF8("removeLiquidity"),
        new BigUIntValue(new BigNumber(amount0Min)),
        new BigUIntValue(new BigNumber(amount1Min)),
      ],
      gasLimit: new GasLimit(1400000000)
    });


    let transactionModel = transaction.toPlainObject();
    return {
      ...transactionModel,
      options: transactionModel.options == undefined ? "" : transactionModel.options,
      status: transactionModel.status == undefined ? "" : transactionModel.status,
      signature: transactionModel.signature == undefined ? "" : transactionModel.signature
    };
  }

  async swapTokensFixedInput(address: string, tokenIn: string, amountIn: number, tokenOut: string, amountOutMin: number): Promise<TransactionModel> {

    let abiRegistry = await AbiRegistry.load({ files: ["./src/elrond_dex_pair.abi.json"] });
    let abi = new SmartContractAbi(abiRegistry, ["Pair"]);
    let contract = new SmartContract({ address: new Address(address), abi: abi });
    let transaction = contract.call({
      func: new ContractFunction("ESDTTransfer"),
      args: [
        BytesValue.fromUTF8(tokenIn),
        new BigUIntValue(new BigNumber(amountIn)),
        BytesValue.fromUTF8("swapTokensFixedInput"),
        BytesValue.fromUTF8(tokenOut),
        new BigUIntValue(new BigNumber(amountOutMin)),
      ],
      gasLimit: new GasLimit(1400000000)
    });

    let transactionModel = transaction.toPlainObject();
    return {
      ...transactionModel,
      options: transactionModel.options == undefined ? "" : transactionModel.options,
      status: transactionModel.status == undefined ? "" : transactionModel.status,
      signature: transactionModel.signature == undefined ? "" : transactionModel.signature
    };
  }

  async swapTokensFixedOutput(address: string, tokenIn: string, amountInMax: number, tokenOut: string, amountOut: number): Promise<TransactionModel> {

    let abiRegistry = await AbiRegistry.load({ files: ["./src/elrond_dex_pair.abi.json"] });
    let abi = new SmartContractAbi(abiRegistry, ["Pair"]);
    let contract = new SmartContract({ address: new Address(address), abi: abi });
    let transaction = contract.call({
      func: new ContractFunction("ESDTTransfer"),
      args: [
        BytesValue.fromUTF8(tokenIn),
        new BigUIntValue(new BigNumber(amountInMax)),
        BytesValue.fromUTF8("swapTokensFixedOutput"),
        BytesValue.fromUTF8(tokenOut),
        new BigUIntValue(new BigNumber(amountOut)),
      ],
      gasLimit: new GasLimit(1400000000)
    });

    let transactionModel = transaction.toPlainObject();
    return {
      ...transactionModel,
      options: transactionModel.options == undefined ? "" : transactionModel.options,
      status: transactionModel.status == undefined ? "" : transactionModel.status,
      signature: transactionModel.signature == undefined ? "" : transactionModel.signature
    };
  }
}
