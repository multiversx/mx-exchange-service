import { Injectable } from '@nestjs/common';
import { AbiRegistry, BigUIntValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem";
import { BytesValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes";
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ProxyProvider, Address, SmartContract, GasLimit } from '@elrondnetwork/erdjs';
import { CacheManagerService } from 'src/services/cache-manager/cache-manager.service';
import { elrondConfig, abiConfig } from '../../config';
import { BigNumber } from 'bignumber.js';
import { PairInfoModel } from '../models/pair-info.model';
import { LiquidityPosition, TokenModel } from '../models/pair.model';
import { PairPriceModel } from '../models/pair-price.model';
import { TransactionModel } from '../models/transaction.model';
import { ContextService } from '../utils/context.service';


@Injectable()
export class PairService {
    private readonly proxy: ProxyProvider;

    constructor(
        private cacheManagerService: CacheManagerService,
        private context: ContextService,
    ) {
        this.proxy = new ProxyProvider(elrondConfig.gateway, 60000);
    }

    private async getContract(address: string): Promise<SmartContract> {
        const abiRegistry = await AbiRegistry.load({ files: [abiConfig.pair] });
        const abi = new SmartContractAbi(abiRegistry, ["Pair"]);
        const contract = new SmartContract({ address: new Address(address), abi: abi });

        return contract;
    }

    async getToken(tokenID: string): Promise<TokenModel> {

        return this.context.getTokenMetadata(tokenID);
    }

    async getLpToken(pairAddress: string): Promise<TokenModel> {
        const cachedData = await this.cacheManagerService.getLpToken(pairAddress);
        if (!!cachedData) {
            return cachedData.lpToken;
        }

        const contract = await this.getContract(pairAddress);
        const getLpTokenInteraction = <Interaction>contract.methods.getLpTokenIdentifier([]);
        const queryResponse = await contract.runQuery(this.proxy, getLpTokenInteraction.buildQuery());
        const result = getLpTokenInteraction.interpretQueryResponse(queryResponse);
        const token = await this.context.getTokenMetadata(result.firstValue.valueOf());

        this.cacheManagerService.setLpToken(pairAddress, { lpToken: token });
        return token;
    }

    async getPairInfo(address: string): Promise<PairInfoModel> {
        const contract = await this.getContract(address);
        const getAllPairsInteraction = <Interaction>contract.methods.getReservesAndTotalSupply([]);

        const queryResponse = await contract.runQuery(this.proxy, getAllPairsInteraction.buildQuery());
        const result = getAllPairsInteraction.interpretQueryResponse(queryResponse);


        const pairInfo = result.values.map(v => v.valueOf())
        return {
            reserves0: pairInfo[0],
            reserves1: pairInfo[1],
            totalSupply: pairInfo[2]
        };
    }

    async getPairPrice(address: string): Promise<PairPriceModel> {
        const pairsMetadata = await this.context.getPairsMetadata();
        const pair = pairsMetadata.find(pair => pair.address === address);
        let pairPrice = new PairPriceModel();

        pairPrice.firstToken = (await this.getAmountOut(pair.address, pair.firstToken, '1')).toString();
        pairPrice.secondToken = (await this.getAmountOut(pair.address, pair.secondToken, '1')).toString();

        return pairPrice;
    }

    async getPairState(pairAddress: string): Promise<boolean> {
        const contract = await this.getContract(pairAddress);

        const getStateInteraction = <Interaction>contract.methods.getState([
        ]);

        const queryResponse = await contract.runQuery(
            this.proxy,
            getStateInteraction.buildQuery()
        );

        const result = getStateInteraction.interpretQueryResponse(queryResponse);
        return result.firstValue.valueOf();
    }

    async getAmountOut(address: string, tokenInId: string, amount: string): Promise<string> {
        const contract = await this.getContract(address);

        const token = await this.context.getTokenMetadata(tokenInId);
        const tokenAmount = `${amount}e${token.decimals.toString()}`;

        const getAmountOut = <Interaction>contract.methods.getAmountOut([
            BytesValue.fromUTF8(tokenInId),
            new BigUIntValue(new BigNumber(tokenAmount))
        ]);

        const queryResponse = await contract.runQuery(
            this.proxy,
            getAmountOut.buildQuery()
        );

        const result = getAmountOut.interpretQueryResponse(queryResponse);
        return result.firstValue.valueOf();
    }

    async getAmountIn(address: string, tokenOutId: string, amount: string): Promise<string> {
        const contract = await this.getContract(address);

        const token = await this.context.getTokenMetadata(tokenOutId);
        const tokenAmount = `${amount}e${token.decimals.toString()}`;

        const getAmountInInteraction = <Interaction>contract.methods.getAmountIn([
            BytesValue.fromUTF8(tokenOutId),
            new BigUIntValue(new BigNumber(tokenAmount))
        ]);

        const queryResponse = await contract.runQuery(
            this.proxy,
            getAmountInInteraction.buildQuery()
        );

        const result = getAmountInInteraction.interpretQueryResponse(queryResponse);
        return result.firstValue.valueOf();
    }

    async getEquivalentForLiquidity(address: string, tokenInId: string, amount: string): Promise<string> {
        const contract = await this.getContract(address);

        const token = await this.context.getTokenMetadata(tokenInId);
        const tokenAmount = `${amount}e${token.decimals.toString()}`;

        const getEquivalentInteraction = <Interaction>contract.methods.getEquivalent([
            BytesValue.fromUTF8(tokenInId),
            new BigUIntValue(new BigNumber(tokenAmount))
        ]);

        const queryResponse = await contract.runQuery(
            this.proxy,
            getEquivalentInteraction.buildQuery()
        );

        const result = getEquivalentInteraction.interpretQueryResponse(queryResponse);
        return result.firstValue.valueOf();
    }

    async getTemporaryFunds(pairAddress: string, callerAddress: string, tokenID: string): Promise<string> {
        const contract = await this.getContract(pairAddress);

        const getTemporaryFundsInteraction = <Interaction>contract.methods.getTemporaryFunds([
            new Address(callerAddress),
            BytesValue.fromUTF8(tokenID)
        ]);

        const queryResponse = await contract.runQuery(
            this.proxy,
            getTemporaryFundsInteraction.buildQuery()
        );

        const result = getTemporaryFundsInteraction.interpretQueryResponse(queryResponse);
        return result.firstValue.valueOf();
    }

    async getLiquidityPosition(pairAddress: string, amount: string): Promise<LiquidityPosition> {
        const contract = await this.getContract(pairAddress);

        const lpToken = await this.getLpToken(pairAddress);
        const tokenAmount = `${amount}e${lpToken.decimals.toString()}`;

        const getLiquidityPositionInteraction = <Interaction>contract.methods.getTokensForGivenPosition([
            new BigUIntValue(new BigNumber(tokenAmount))
        ]);

        const queryResponse = await contract.runQuery(
            this.proxy,
            getLiquidityPositionInteraction.buildQuery()
        );

        const result = getLiquidityPositionInteraction.interpretQueryResponse(queryResponse);

        return {
            firstToken: result.values[0].valueOf().amount,
            secondToken: result.values[1].valueOf().amount
        };
    }

    async addLiquidity(pairAddress: string, amount0: string, amount1: string, tolerance: number): Promise<TransactionModel> {
        const contract = await this.getContract(pairAddress);
        const pairsMetadata = await this.context.getPairsMetadata();
        const pair = pairsMetadata.find(pair => pair.address === pairAddress);
        const token0 = await this.getToken(pair.firstToken);
        const token1 = await this.getToken(pair.secondToken);
        const amount0Denom = new BigNumber(`${amount0}e${token0.decimals.toString()}`);
        const amount1Denom = new BigNumber(`${amount1}e${token1.decimals.toString()}`);

        const amount0Min = amount0Denom.multipliedBy(1 - tolerance);
        const amount1Min = amount1Denom.multipliedBy(1 - tolerance);

        const addLiquidityInteraction = <Interaction>contract.methods.addLiquidity([
            new BigUIntValue(amount0Denom),
            new BigUIntValue(amount1Denom),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ]);

        const transaction = addLiquidityInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(1400000000));

        return transaction.toPlainObject();
    }

}
