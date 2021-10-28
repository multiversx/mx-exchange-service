import {
    AbiRegistry,
    Address,
    ProxyProvider,
    SmartContract,
    SmartContractAbi,
} from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { abiConfig, elrondConfig, scAddress } from '../../config';
import Agent, { HttpsAgent } from 'agentkeepalive';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { SmartContractProfiler } from '../../helpers/smartcontract.profiler';

@Injectable()
export class ElrondProxyService {
    private readonly proxy: ProxyProvider;

    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        const keepAliveOptions = {
            maxSockets: elrondConfig.keepAliveMaxSockets,
            maxFreeSockets: elrondConfig.keepAliveMaxFreeSockets,
            timeout: elrondConfig.keepAliveTimeout,
            freeSocketTimeout: elrondConfig.keepAliveFreeSocketTimeout,
        };
        const httpAgent = new Agent(keepAliveOptions);
        const httpsAgent = new HttpsAgent(keepAliveOptions);

        this.proxy = new ProxyProvider(process.env.ELRONDAPI_URL, {
            timeout: elrondConfig.proxyTimeout,
            httpAgent: elrondConfig.keepAlive ? httpAgent : null,
            httpsAgent: elrondConfig.keepAlive ? httpsAgent : null,
        });
    }

    getService(): ProxyProvider {
        return this.proxy;
    }

    async getAddressShardID(address: string): Promise<number> {
        const response = await this.getService().doGetGeneric(
            `address/${address}/shard`,
            response => response,
        );
        return response.shardID;
    }

    async getRouterSmartContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.routerAddress,
            abiConfig.router,
            'Router',
        );
    }

    async getPairSmartContract(pairAddress: string): Promise<SmartContract> {
        return this.getSmartContract(pairAddress, abiConfig.pair, 'Pair');
    }

    async getWrapSmartContract(shardID = 1): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.wrappingAddress.get(`shardID-${shardID}`),
            abiConfig.wrap,
            'EgldEsdtSwap',
        );
    }

    async getFarmSmartContract(farmAddress: string): Promise<SmartContract> {
        return this.getSmartContract(farmAddress, abiConfig.farm, 'Farm');
    }

    async getProxyDexSmartContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.proxyDexAddress,
            abiConfig.proxy,
            'ProxyDexImpl',
        );
    }

    async getDistributionSmartContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.distributionAddress,
            abiConfig.distribution,
            'Distribution',
        );
    }

    async getLockedAssetFactorySmartContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.lockedAssetAddress,
            abiConfig.lockedAssetFactory,
            'LockedAssetFactory',
        );
    }

    async getSmartContract(
        contractAddress: string,
        contractAbiPath: string,
        contractInterface: string,
    ): Promise<SmartContract> {
        const abiRegistry = await AbiRegistry.load({
            files: [contractAbiPath],
        });
        const abi = new SmartContractAbi(abiRegistry, [contractInterface]);

        return new SmartContractProfiler({
            address: new Address(contractAddress),
            abi: abi,
        });
    }
}
