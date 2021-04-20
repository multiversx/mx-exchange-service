import { Injectable } from '@nestjs/common';
import { CacheManagerService } from 'src/services/cache-manager/cache-manager.service';
import { elrondConfig, abiConfig } from '../../config';
import { AbiRegistry } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem";
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ProxyProvider, Address, SmartContract, GasLimit, ApiProvider } from '@elrondnetwork/erdjs';
import { TokenModel } from '../models/pair.model';

@Injectable()
export class ContextService {
    private readonly proxy: ProxyProvider;
    private readonly apiFacade: ApiProvider;

    constructor(
        private cacheManagerService: CacheManagerService,
    ) {
        this.proxy = new ProxyProvider(elrondConfig.gateway, 60000);
        this.apiFacade = new ApiProvider(elrondConfig.elrondApi, 60000);

    }

    async getPairsMetadata() {
        const cachedData = await this.cacheManagerService.getPairsMetadata();
        if (!!cachedData) {
            return cachedData.pairsMetadata;
        }

        let abiRegistry = await AbiRegistry.load({ files: [abiConfig.router] });
        let abi = new SmartContractAbi(abiRegistry, ["Router"]);
        let contract = new SmartContract({ address: new Address(elrondConfig.routerAddress), abi: abi });

        let getAllPairsInteraction = <Interaction>contract.methods.getAllPairContractMetadata([]);

        let queryResponse = await contract.runQuery(this.proxy, getAllPairsInteraction.buildQuery());
        let result = getAllPairsInteraction.interpretQueryResponse(queryResponse);

        let pairsMetadata = result.firstValue.valueOf().map(v => {
            return {
                firstToken: v.first_token_id.toString(),
                secondToken: v.second_token_id.toString(),
                address: v.address.toString()
            }
        });
        this.cacheManagerService.setPairsMetadata({ pairsMetadata: pairsMetadata });

        return pairsMetadata;
    }

    async getTokenMetadata(tokenID: string): Promise<TokenModel> {
        const cachedData = await this.cacheManagerService.getToken(tokenID);
        if (!!cachedData) {
            return cachedData.token;
        }

        let tokenMetadata = await this.apiFacade.getESDTToken(tokenID);
        this.cacheManagerService.setToken(tokenID, { token: tokenMetadata });
        return tokenMetadata;
    }
}