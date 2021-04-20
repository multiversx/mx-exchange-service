import { Injectable, Res } from '@nestjs/common';
import { AbiRegistry, BigUIntValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem";
import { BytesValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes";
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ProxyProvider, Address, SmartContract, GasLimit } from '@elrondnetwork/erdjs';
import { CacheManagerService } from 'src/services/cache-manager/cache-manager.service';
import { elrondConfig, abiConfig } from '../../config';
import BigNumber from '@elrondnetwork/erdjs/node_modules/bignumber.js';
import { PairInfoModel } from '../models/pair-info.model';
import { TokenModel } from '../models/pair.model';
import { PairPriceModel } from '../models/pair-price.model';
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

    async getToken(tokenID: string): Promise<TokenModel> {

        return this.context.getTokenMetadata(tokenID);
    }

    async getPairInfo(address: string): Promise<PairInfoModel> {
        let abiRegistry = await AbiRegistry.load({ files: [abiConfig.pair] });
        let abi = new SmartContractAbi(abiRegistry, ["Pair"]);
        let contract = new SmartContract({ address: new Address(address), abi: abi });

        let getAllPairsInteraction = <Interaction>contract.methods.getReservesAndTotalSupply([]);

        let queryResponse = await contract.runQuery(this.proxy, getAllPairsInteraction.buildQuery());
        let result = getAllPairsInteraction.interpretQueryResponse(queryResponse);


        let pairInfo = result.values.map(v => v.valueOf())
        return {
            reserves0: pairInfo[0],
            reserves1: pairInfo[1],
            totalSupply: pairInfo[2]
        };
    }

    async getPairPrice(address: string): Promise<PairPriceModel> {
        let pairsMetadata = await this.context.getPairsMetadata();
        let pair = pairsMetadata.find(pair => pair.address === address);
        let pairPrice = new PairPriceModel();

        pairPrice.firstToken = await (await this.getAmountOut(pair.address, pair.firstToken, '1')).toString();
        pairPrice.secondToken = await (await this.getAmountOut(pair.address, pair.secondToken, '1')).toString();

        return pairPrice;
    }

    async getAmountOut(pairAddress: string, tokenInId: string, amount: string): Promise<number> {
        let token = await this.context.getTokenMetadata(tokenInId);
        let tokenAmount = amount + 'e' + token.decimals.toString();
        let abiRegistry = await AbiRegistry.load({ files: [abiConfig.pair] });
        let abi = new SmartContractAbi(abiRegistry, ["Pair"]);
        let contract = new SmartContract({ address: new Address(pairAddress), abi: abi });

        let getAmountOut = <Interaction>contract.methods.getAmountOut([
            BytesValue.fromUTF8(tokenInId),
            new BigUIntValue(new BigNumber(tokenAmount))
        ]);

        let queryResponse = await contract.runQuery(
            this.proxy,
            getAmountOut.buildQuery()
        );

        let result = getAmountOut.interpretQueryResponse(queryResponse);
        return result.firstValue.valueOf();
    }
}
