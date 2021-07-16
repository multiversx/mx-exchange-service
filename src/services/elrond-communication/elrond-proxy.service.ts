import {
    AbiRegistry,
    Address,
    ProxyProvider,
    SmartContract,
    SmartContractAbi,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import { SmartContractType } from '../../modules/token-merging/dto/token.merging.args';
import { abiConfig, elrondConfig, scAddress } from '../../config';
import Agent, { HttpsAgent } from 'agentkeepalive';

@Injectable()
export class ElrondProxyService {
    private readonly proxy: ProxyProvider;

    constructor() {
        const keepAliveOptions = {
            maxSockets: elrondConfig.keepAliveMaxSockets,
            maxFreeSockets: elrondConfig.keepAliveMaxFreeSockets,
            timeout: elrondConfig.keepAliveTimeout,
            freeSocketTimeout: elrondConfig.keepAliveFreeSocketTimeout,
        };
        const httpAgent = new Agent(keepAliveOptions);
        const httpsAgent = new HttpsAgent(keepAliveOptions);

        this.proxy = new ProxyProvider(elrondConfig.gateway, {
            timeout: elrondConfig.proxyTimeout,
            httpAgent: elrondConfig.keepAlive ? httpAgent : null,
            httpsAgent: elrondConfig.keepAlive ? httpsAgent : null,
        });
    }

    getService(): ProxyProvider {
        return this.proxy;
    }

    async getSmartContractByType(
        type: SmartContractType,
        address?: string,
    ): Promise<SmartContract> {
        switch (type) {
            case SmartContractType.FARM:
                return this.getFarmSmartContract(address);
            case SmartContractType.LOCKED_ASSET_FACTORY:
                return this.getLockedAssetFactorySmartContract();
            case SmartContractType.PROXY_PAIR:
                return this.getProxyDexSmartContract();
            case SmartContractType.PROXY_FARM:
                return this.getProxyDexSmartContract();
        }
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

        const contract = new SmartContract({
            address: new Address(contractAddress),
            abi: abi,
        });
        return contract;
    }
}
