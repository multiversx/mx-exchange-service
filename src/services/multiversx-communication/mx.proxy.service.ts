import {
    AbiRegistry,
    Address,
    SmartContractTransactionsFactory,
    TransactionsFactoryConfig,
} from '@multiversx/sdk-core';
import { Inject, Injectable } from '@nestjs/common';
import { abiConfig, mxConfig, scAddress } from '../../config';
import Agent, { HttpsAgent } from 'agentkeepalive';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ProxyNetworkProviderProfiler } from '../../helpers/proxy.network.provider.profiler';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { farmType, farmVersion } from 'src/utils/farm.utils';
import { promises } from 'fs';
import { proxyVersion } from 'src/utils/proxy.utils';
import { GovernanceType } from '../../utils/governance';
import { TransactionOptions } from 'src/modules/common/transaction.options';
import { TransactionModel } from 'src/models/transaction.model';

@Injectable()
export class MXProxyService {
    private readonly proxy: ProxyNetworkProviderProfiler;
    private static abiCache: Map<string, AbiRegistry> = new Map();
    private static smartContractTransactionFactories: SmartContractTransactionsFactory[];

    constructor(
        private readonly apiConfigService: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        const keepAliveOptions = {
            maxSockets: mxConfig.keepAliveMaxSockets,
            maxFreeSockets: mxConfig.keepAliveMaxFreeSockets,
            timeout: this.apiConfigService.getKeepAliveTimeoutDownstream(),
            freeSocketTimeout: mxConfig.keepAliveFreeSocketTimeout,
            keepAlive: true,
        };
        const httpAgent = new Agent(keepAliveOptions);
        const httpsAgent = new HttpsAgent(keepAliveOptions);

        this.proxy = new ProxyNetworkProviderProfiler(
            this.apiConfigService,
            this.apiConfigService.getGatewayUrl(),
            {
                timeout: mxConfig.proxyTimeout,
                httpAgent: mxConfig.keepAlive ? httpAgent : null,
                httpsAgent: mxConfig.keepAlive ? httpsAgent : null,
                headers: {
                    origin: 'xExchangeService',
                },
                clientName: 'xExchangeService',
            },
        );

        MXProxyService.smartContractTransactionFactories = [];
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

    async getRouterAbi(): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.router, 'Router');
    }

    async getRouterSmartContractTransaction(
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            scAddress.routerAddress,
            abiConfig.router,
            'Router',
            options,
        );
    }

    async getPairAbi(): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.pair, 'Pair');
    }

    async getPairSmartContractTransaction(
        pairAddress: string,
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            pairAddress,
            abiConfig.pair,
            'Pair',
            options,
        );
    }

    async getWrapAbi(): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.wrap, 'EgldEsdtSwap');
    }

    async getWrapSmartContractTransaction(
        shardID = 1,
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            scAddress.wrappingAddress.get(`shardID-${shardID}`),
            abiConfig.wrap,
            'EgldEsdtSwap',
            options,
        );
    }

    async getFarmAbi(farmAddress: string): Promise<AbiRegistry> {
        const version = farmVersion(farmAddress);
        const type = farmType(farmAddress);

        const abiPath =
            type === undefined
                ? abiConfig.farm[version]
                : abiConfig.farm[version][type];
        const contractInterface =
            type === undefined
                ? `Farm_${version}`
                : `Farm_${version}_${type}`;
        return this.getAbi(abiPath, contractInterface);
    }

    async getFarmSmartContractTransaction(
        farmAddress: string,
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        const version = farmVersion(farmAddress);
        const type = farmType(farmAddress);
        let abiPath = abiConfig.farm[version];
        let contractInterface = `Farm_${version}`;

        if (type !== undefined) {
            abiPath = abiConfig.farm[version][type];
            contractInterface = `Farm_${version}_${type}`;
        }

        return this.getSmartContractTransaction(
            farmAddress,
            abiPath,
            contractInterface,
            options,
        );
    }

    async getStakingAbi(): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.staking, 'Farm');
    }

    async getStakingSmartContractTransaction(
        stakeAddress: string,
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            stakeAddress,
            abiConfig.staking,
            'Farm',
            options,
        );
    }

    async getStakingProxyAbi(): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.stakingProxy, 'FarmStakingProxy');
    }

    async getStakingProxySmartContractTransaction(
        stakingProxyAddress: string,
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            stakingProxyAddress,
            abiConfig.stakingProxy,
            'FarmStakingProxy',
            options,
        );
    }

    async getProxyDexAbi(proxyAddress: string): Promise<AbiRegistry> {
        const version = proxyVersion(proxyAddress);
        return this.getAbi(abiConfig.proxy[version], 'ProxyDexImpl');
    }

    async getProxyDexSmartContractTransaction(
        proxyAddress: string,
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        const version = proxyVersion(proxyAddress);

        return this.getSmartContractTransaction(
            proxyAddress,
            abiConfig.proxy[version],
            'ProxyDexImpl',
            options,
        );
    }

    async getDistributionAbi(): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.distribution, 'Distribution');
    }

    async getDistributionSmartContractTransaction(
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            scAddress.distributionAddress,
            abiConfig.distribution,
            'Distribution',
            options,
        );
    }

    async getLockedAssetFactoryAbi(): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.lockedAssetFactory, 'LockedAssetFactory');
    }

    async getLockedAssetFactorySmartContractTransaction(
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            scAddress.lockedAssetAddress,
            abiConfig.lockedAssetFactory,
            'LockedAssetFactory',
            options,
        );
    }

    async getPriceDiscoveryAbi(): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.priceDiscovery, 'PriceDiscovery');
    }

    async getPriceDiscoverySmartContractTransaction(
        priceDiscoveryAddress: string,
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            priceDiscoveryAddress,
            abiConfig.priceDiscovery,
            'PriceDiscovery',
            options,
        );
    }

    async getSimpleLockAbi(): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.simpleLock, 'SimpleLock');
    }

    async getSimpleLockSmartContractTransaction(
        simpleLockAddress: string,
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            simpleLockAddress,
            abiConfig.simpleLock,
            'SimpleLock',
            options,
        );
    }

    async getSimpleLockEnergyAbi(): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.simpleLockEnergy, 'SimpleLockEnergy');
    }

    async getSimpleLockEnergySmartContractTransaction(
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            scAddress.simpleLockEnergy,
            abiConfig.simpleLockEnergy,
            'SimpleLockEnergy',
            options,
        );
    }

    async getMetabondingStakingAbi(): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.metabondingStaking, 'MetabondingStaking');
    }

    async getMetabondingStakingSmartContractTransaction(
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            scAddress.metabondingStakingAddress,
            abiConfig.metabondingStaking,
            'MetabondingStaking',
            options,
        );
    }

    async getFeesCollectorAbi(): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.feesCollector, 'FeesCollector');
    }

    async getFeesCollectorSmartContractTransaction(
        options: TransactionOptions,
        contractAddress?: string,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            contractAddress ?? scAddress.feesCollector,
            abiConfig.feesCollector,
            'FeesCollector',
            options,
        );
    }

    async getLockedTokenWrapperAbi(): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.lockedTokenWrapper, 'LockedTokenWrapper');
    }

    async getLockedTokenWrapperSmartContractTransaction(
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            scAddress.lockedTokenWrapper,
            abiConfig.lockedTokenWrapper,
            'LockedTokenWrapper',
            options,
        );
    }

    async getEnergyUpdateAbi(): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.energyUpdate, 'EnergyUpdate');
    }

    async getEnergyUpdateSmartContractTransaction(
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            scAddress.energyUpdate,
            abiConfig.energyUpdate,
            'EnergyUpdate',
            options,
        );
    }

    async getTokenUnstakeAbi(): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.tokenUnstake, 'TokenUnstakeModule');
    }

    async getTokenUnstakeSmartContractTransaction(
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            scAddress.tokenUnstake,
            abiConfig.tokenUnstake,
            'TokenUnstakeModule',
            options,
        );
    }

    async getEscrowAbi(): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.escrow, 'LkmexTransfer');
    }

    async getEscrowSmartContractTransaction(
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            scAddress.escrow,
            abiConfig.escrow,
            'LkmexTransfer',
            options,
        );
    }

    async getGovernanceAbi(type: GovernanceType): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.governance[type], `GovernanceV2_${type}`);
    }

    async getGovernanceSmartContractTransaction(
        governanceAddress: string,
        type: GovernanceType,
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            governanceAddress,
            abiConfig.governance[type],
            `GovernanceV2_${type}`,
            options,
        );
    }

    async getPositionCreatorAbi(): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.positionCreator, 'AutoPosCreator');
    }

    async getPositionCreatorContractTransaction(
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            scAddress.positionCreator,
            abiConfig.positionCreator,
            'AutoPosCreator',
            options,
        );
    }

    async getLockedTokenPositionCreatorAbi(): Promise<AbiRegistry> {
        return this.getAbi(
            abiConfig.lockedTokenPositionCreator,
            'LockedTokenPosCreatorContract',
        );
    }

    async getLockedTokenPositionCreatorContractTransaction(
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            scAddress.lockedTokenPositionCreator,
            abiConfig.lockedTokenPositionCreator,
            'LockedTokenPosCreatorContract',
            options,
        );
    }

    async getComposableTasksAbi(): Promise<AbiRegistry> {
        return this.getAbi(abiConfig.composableTasks, 'ComposableTasksContract');
    }

    async getComposableTasksContractTransaction(
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        return this.getSmartContractTransaction(
            scAddress.composableTasks,
            abiConfig.composableTasks,
            'ComposableTasksContract',
            options,
        );
    }

    async getAbi(
        contractAbiPath: string,
        contractInterface: string,
    ): Promise<AbiRegistry> {
        const cached = MXProxyService.abiCache.get(contractInterface);
        if (cached) {
            return cached;
        }
        const jsonContent: string = await promises.readFile(contractAbiPath, {
            encoding: 'utf8',
        });
        const json = JSON.parse(jsonContent);
        const abi = AbiRegistry.create(json);
        MXProxyService.abiCache.set(contractInterface, abi);
        return abi;
    }

    async getSmartContractTransaction(
        contractAddress: string,
        contractAbiPath: string,
        contractInterface: string,
        options: TransactionOptions,
    ): Promise<TransactionModel> {
        const factory = await this.getSmartContractTransactionFactory(
            contractAbiPath,
            contractInterface,
            options.chainID ?? mxConfig.chainID,
        );

        const transaction = await factory.createTransactionForExecute(
            Address.newFromBech32(options.sender),
            {
                contract: Address.newFromBech32(contractAddress),
                function: options.function,
                gasLimit: BigInt(options.gasLimit),
                arguments: options.arguments ?? [],
                nativeTransferAmount: options.nativeTransferAmount
                    ? BigInt(options.nativeTransferAmount)
                    : BigInt(0),
                tokenTransfers: options.tokenTransfers ?? [],
            },
        );
        return transaction.toPlainObject();
    }

    async getSmartContractTransactionFactory(
        contractAbiPath: string,
        contractInterface: string,
        chainID: string,
    ): Promise<SmartContractTransactionsFactory> {
        return (
            MXProxyService.smartContractTransactionFactories[
                contractInterface
            ] ||
            this.createSmartContractTransactionsFactory(
                contractAbiPath,
                contractInterface,
                chainID,
            )
        );
    }

    private async createSmartContractTransactionsFactory(
        contractAbiPath: string,
        contractInterface: string,
        chainID: string,
    ): Promise<SmartContractTransactionsFactory> {
        const jsonContent: string = await promises.readFile(contractAbiPath, {
            encoding: 'utf8',
        });
        const json = JSON.parse(jsonContent);

        const factory = new SmartContractTransactionsFactory({
            config: new TransactionsFactoryConfig({ chainID }),
            abi: AbiRegistry.create(json),
        });

        MXProxyService.smartContractTransactionFactories[contractInterface] =
            factory;
        return factory;
    }
}
