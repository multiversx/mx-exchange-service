import { PairModel, PairInfoModel, TransactionModel } from '../dex.model';
import { Injectable, Res } from '@nestjs/common';
import { AbiRegistry, BigUIntValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem";
import { BytesValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes";
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ContractFunction, ProxyProvider, Address, SmartContract, GasLimit } from '@elrondnetwork/erdjs';
import { CacheManagerService } from 'src/services/cache-manager/cache-manager.service';
import { elrondConfig } from '../../config';
import BigNumber from 'bignumber.js';


@Injectable()
export class PairService {
    private readonly proxy: ProxyProvider;

    constructor(
        private cacheManagerService: CacheManagerService,
    ) {
        this.proxy = new ProxyProvider(elrondConfig.gateway, 60000);
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
            getAmoountOut.buildQuery()
        );

        let result = getAmoountOut.interpretQueryResponse(queryResponse);

        return result.values[0].valueOf();

    }

}
