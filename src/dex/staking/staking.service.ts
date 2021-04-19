import { TransactionModel } from '../dex.model';
import { PairModel } from '../models/pair.model';
import { DexFactoryModel } from '../models/factory.model';
import { Injectable, Res } from '@nestjs/common';
import { AbiRegistry, BigUIntValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem";
import { BytesValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes";
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ContractFunction, ProxyProvider, Address, SmartContract, GasLimit } from '@elrondnetwork/erdjs';
import { CacheManagerService } from 'src/services/cache-manager/cache-manager.service';
import { ApiResponse, Client } from '@elastic/elasticsearch';
import { elrondConfig } from '../../config';
import { ContextService } from '../utils/context.service';


@Injectable()
export class StakingService {
    private readonly proxy: ProxyProvider;
    private readonly elasticClient: Client;

    constructor(
        private cacheManagerService: CacheManagerService,
        private context: ContextService,
    ) {
        this.proxy = new ProxyProvider(elrondConfig.gateway, 60000);
        this.elasticClient = new Client({
            node: elrondConfig.elastic + '/transactions',
        });
    }
}