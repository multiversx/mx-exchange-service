import {
    AbiRegistry,
    Address,
    SmartContract,
    SmartContractAbi,
} from '@multiversx/sdk-core';
import { Inject, Injectable } from '@nestjs/common';
import { abiConfig, elrondConfig, scAddress } from '../../config';
import Agent, { HttpsAgent } from 'agentkeepalive';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ProxyNetworkProviderProfiler } from '../../helpers/proxy.network.provider.profiler';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { farmType, farmVersion } from 'src/utils/farm.utils';
import { promises } from 'fs';
import { proxyVersion } from 'src/utils/proxy.utils';

@Injectable()
export class ElrondProxyService {
    private readonly proxy: ProxyNetworkProviderProfiler;
    private static smartContracts: SmartContract[];

    constructor(
        private readonly apiConfigService: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        const keepAliveOptions = {
            maxSockets: elrondConfig.keepAliveMaxSockets,
            maxFreeSockets: elrondConfig.keepAliveMaxFreeSockets,
            timeout: this.apiConfigService.getKeepAliveTimeoutDownstream(),
            freeSocketTimeout: elrondConfig.keepAliveFreeSocketTimeout,
            keepAlive: true,
        };
        const httpAgent = new Agent(keepAliveOptions);
        const httpsAgent = new HttpsAgent(keepAliveOptions);

        this.proxy = new ProxyNetworkProviderProfiler(
            this.apiConfigService.getApiUrl(),
            {
                timeout: elrondConfig.proxyTimeout,
                httpAgent: elrondConfig.keepAlive ? httpAgent : null,
                httpsAgent: elrondConfig.keepAlive ? httpsAgent : null,
                headers: {
                    origin: 'MaiarExchangeService',
                },
            },
        );

        ElrondProxyService.smartContracts = [];
    }

    getService(): ProxyNetworkProviderProfiler {
        return this.proxy;
    }

    async getAddressShardID(address: string): Promise<number> {
        const response = await this.getService().doGetGeneric(
            `address/${address}/shard`,
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
        const version = farmVersion(farmAddress);
        const type = farmType(farmAddress);

        const abiPath =
            type === undefined
                ? abiConfig.farm[version]
                : abiConfig.farm[version][type];
        return await this.getSmartContract(farmAddress, abiPath, 'Farm');
    }

    async getStakingSmartContract(
        stakeAddress: string,
    ): Promise<SmartContract> {
        return await this.getSmartContract(
            stakeAddress,
            abiConfig.staking,
            'Farm',
        );
    }

    async getStakingProxySmartContract(
        stakingProxyAddress: string,
    ): Promise<SmartContract> {
        return await this.getSmartContract(
            stakingProxyAddress,
            abiConfig.stakingProxy,
            'FarmStakingProxy',
        );
    }

    async getProxyDexSmartContract(
        proxyAddress: string,
    ): Promise<SmartContract> {
        const version = proxyVersion(proxyAddress);
        return this.getSmartContract(
            proxyAddress,
            abiConfig.proxy[version],
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

    async getPriceDiscoverySmartContract(
        priceDiscoveryAddress: string,
    ): Promise<SmartContract> {
        return this.getSmartContract(
            priceDiscoveryAddress,
            abiConfig.priceDiscovery,
            'PriceDiscovery',
        );
    }

    async getSimpleLockSmartContract(
        simpleLockAddress: string,
    ): Promise<SmartContract> {
        return this.getSmartContract(
            simpleLockAddress,
            abiConfig.simpleLock,
            'SimpleLock',
        );
    }

    async getSimpleLockEnergySmartContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.simpleLockEnergy,
            abiConfig.simpleLockEnergy,
            'SimpleLockEnergy',
        );
    }

    async getMetabondingStakingSmartContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.metabondingStakingAddress,
            abiConfig.metabondingStaking,
            'MetabondingStaking',
        );
    }

    async getFeesCollectorContract(
        contractAddress?: string,
    ): Promise<SmartContract> {
        return this.getSmartContract(
            contractAddress ?? scAddress.feesCollector,
            abiConfig.feesCollector,
            'FeesCollector',
        );
    }

    async getLockedTokenWrapperContract(address: string) {
        return this.getSmartContract(
            address,
            abiConfig.lockedTokenWrapper,
            'LockedTokenWrapper',
        );
    }

    async getEnergyUpdateContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.energyUpdate,
            abiConfig.energyUpdate,
            'EnergyUpdate',
        );
    }

    async getTokenUnstakeContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.tokenUnstake,
            abiConfig.tokenUnstake,
            'TokenUnstakeModule',
        );
    }

    async getSmartContract(
        contractAddress: string,
        contractAbiPath: string,
        contractInterface: string,
    ): Promise<SmartContract> {
        return (
            ElrondProxyService.smartContracts[contractAddress] ||
            this.createSmartContract(
                contractAddress,
                contractAbiPath,
                contractInterface,
            )
        );
    }

    private async createSmartContract(
        contractAddress: string,
        contractAbiPath: string,
        contractInterface: string,
    ): Promise<SmartContract> {
        const jsonContent: string = await promises.readFile(contractAbiPath, {
            encoding: 'utf8',
        });
        const json = JSON.parse(jsonContent);
        const abiRegistry = AbiRegistry.create(json);
        const newSC = new SmartContract({
            address: Address.fromString(contractAddress),
            abi: new SmartContractAbi(abiRegistry, [contractInterface]),
        });
        ElrondProxyService.smartContracts[contractAddress] = newSC;
        return newSC;
    }
}
