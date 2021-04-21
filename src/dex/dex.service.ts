import { Injectable, Res } from '@nestjs/common';
import { AbiRegistry, BigUIntValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem";
import { BytesValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes";
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { ContractFunction, ProxyProvider, Address, SmartContract, GasLimit } from '@elrondnetwork/erdjs';
import { CacheManagerService } from 'src/services/cache-manager/cache-manager.service';
import { elrondConfig, abiConfig } from '../config';
import BigNumber from '@elrondnetwork/erdjs/node_modules/bignumber.js';
import { TransactionModel } from './models/transaction.model';

@Injectable()
export class DexService {
  private readonly proxy: ProxyProvider;

  constructor(
    private cacheManagerService: CacheManagerService,
  ) {
    this.proxy = new ProxyProvider(elrondConfig.gateway, 60000);
  }

  async addLiquidity(address: string, amount0: number, amount1: number, amount0Min: number, amount1Min: number): Promise<TransactionModel> {
    let abiRegistry = await AbiRegistry.load({ files: [abiConfig.pair] });
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

  async esdtTransfer(address: string, token: string, amount: number): Promise<TransactionModel> {
    let abiRegistry = await AbiRegistry.load({ files: [abiConfig.pair] });
    let abi = new SmartContractAbi(abiRegistry, ["Pair"]);
    let contract = new SmartContract({ address: new Address(address), abi: abi });
    let transaction = contract.call({
      func: new ContractFunction("ESDTTransfer"),
      args: [
        BytesValue.fromUTF8(token),
        new BigUIntValue(new BigNumber(amount)),
        BytesValue.fromUTF8("acceptEsdtPayment"),

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

    let abiRegistry = await AbiRegistry.load({ files: [abiConfig.pair] });
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

    let abiRegistry = await AbiRegistry.load({ files: [abiConfig.pair] });
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

    let abiRegistry = await AbiRegistry.load({ files: [abiConfig.pair] });
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
