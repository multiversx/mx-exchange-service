import { Injectable } from '@nestjs/common';
import { CacheManagerService } from 'src/services/cache-manager/cache-manager.service';
import { elrondConfig, abiConfig } from '../../config';
import {
    AbiRegistry,
    TypedValue,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import {
    ProxyProvider,
    Address,
    SmartContract,
    GasLimit,
    ApiProvider,
    ContractFunction,
} from '@elrondnetwork/erdjs';
import { TokenModel } from '../models/pair.model';
import { TransactionModel } from '../models/transaction.model';
import BigNumber from 'bignumber.js';

interface PairMetadata {
    address: string;
    firstToken: string;
    secondToken: string;
}

@Injectable()
export class ContextService {
    private readonly proxy: ProxyProvider;
    private readonly apiFacade: ApiProvider;

    constructor(private cacheManagerService: CacheManagerService) {
        this.proxy = new ProxyProvider(elrondConfig.gateway, 60000);
        this.apiFacade = new ApiProvider(elrondConfig.elrondApi, 60000);
    }

    async getPairsMetadata(): Promise<PairMetadata[]> {
        const cachedData = await this.cacheManagerService.getPairsMetadata();
        if (!!cachedData) {
            return cachedData.pairsMetadata;
        }

        const abiRegistry = await AbiRegistry.load({
            files: [abiConfig.router],
        });
        const abi = new SmartContractAbi(abiRegistry, ['Router']);
        const contract = new SmartContract({
            address: new Address(elrondConfig.routerAddress),
            abi: abi,
        });

        const getAllPairsInteraction: Interaction = contract.methods.getAllPairContractMetadata(
            [],
        );

        const queryResponse = await contract.runQuery(
            this.proxy,
            getAllPairsInteraction.buildQuery(),
        );
        const result = getAllPairsInteraction.interpretQueryResponse(
            queryResponse,
        );

        const pairsMetadata = result.firstValue.valueOf().map(v => {
            return {
                firstToken: v.first_token_id.toString(),
                secondToken: v.second_token_id.toString(),
                address: v.address.toString(),
            };
        });
        this.cacheManagerService.setPairsMetadata({
            pairsMetadata: pairsMetadata,
        });

        return pairsMetadata;
    }

    async getPairMetadata(pairAddress: string): Promise<PairMetadata> {
        const pairs = await this.getPairsMetadata();
        const pair = pairs.find(pair => pair.address === pairAddress);

        return pair;
    }

    async getTokenMetadata(tokenID: string): Promise<TokenModel> {
        const cachedData = await this.cacheManagerService.getToken(tokenID);
        if (!!cachedData) {
            return cachedData.token;
        }

        const tokenMetadata = await this.apiFacade.getESDTToken(tokenID);
        this.cacheManagerService.setToken(tokenID, { token: tokenMetadata });
        return tokenMetadata;
    }

    async esdtTransfer(
        contract: SmartContract,
        args: TypedValue[],
        gasLimit: GasLimit,
    ): Promise<TransactionModel> {
        return contract
            .call({
                func: new ContractFunction('ESDTTransfer'),
                args: args,
                gasLimit: gasLimit,
            })
            .toPlainObject();
    }

    public toBigNumber(value: string, token: TokenModel): BigNumber {
        return new BigNumber(`${value}e+${token.decimals}`);
    }

    public fromBigNumber(value: string, token: TokenModel): BigNumber {
        return new BigNumber(`${value}e-${token.decimals}`);
    }
}
