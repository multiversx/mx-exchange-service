import {
    AbiRegistry,
    Address,
    SmartContract,
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
    private static smartContracts: SmartContract[];
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

        MXProxyService.smartContracts = [];
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

    async getRouterSmartContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.routerAddress,
            abiConfig.router,
            'Router',
        );
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

    async getPairSmartContract(pairAddress: string): Promise<SmartContract> {
        return this.getSmartContract(pairAddress, abiConfig.pair, 'Pair');
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

    async getWrapSmartContract(shardID = 1): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.wrappingAddress.get(`shardID-${shardID}`),
            abiConfig.wrap,
            'EgldEsdtSwap',
        );
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

    async getFarmSmartContract(farmAddress: string): Promise<SmartContract> {
        const version = farmVersion(farmAddress);
        const type = farmType(farmAddress);

        const abiPath =
            type === undefined
                ? abiConfig.farm[version]
                : abiConfig.farm[version][type];
        return await this.getSmartContract(farmAddress, abiPath, 'Farm');
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

    async getStakingSmartContract(
        stakeAddress: string,
    ): Promise<SmartContract> {
        return await this.getSmartContract(
            stakeAddress,
            abiConfig.staking,
            'Farm',
        );
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

    async getStakingProxySmartContract(
        stakingProxyAddress: string,
    ): Promise<SmartContract> {
        return await this.getSmartContract(
            stakingProxyAddress,
            abiConfig.stakingProxy,
            'FarmStakingProxy',
        );
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

    async getDistributionSmartContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.distributionAddress,
            abiConfig.distribution,
            'Distribution',
        );
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

    async getLockedAssetFactorySmartContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.lockedAssetAddress,
            abiConfig.lockedAssetFactory,
            'LockedAssetFactory',
        );
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

    async getPriceDiscoverySmartContract(
        priceDiscoveryAddress: string,
    ): Promise<SmartContract> {
        return this.getSmartContract(
            priceDiscoveryAddress,
            abiConfig.priceDiscovery,
            'PriceDiscovery',
        );
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

    async getSimpleLockSmartContract(
        simpleLockAddress: string,
    ): Promise<SmartContract> {
        return this.getSmartContract(
            simpleLockAddress,
            abiConfig.simpleLock,
            'SimpleLock',
        );
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

    async getSimpleLockEnergySmartContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.simpleLockEnergy,
            abiConfig.simpleLockEnergy,
            'SimpleLockEnergy',
        );
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

    async getMetabondingStakingSmartContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.metabondingStakingAddress,
            abiConfig.metabondingStaking,
            'MetabondingStaking',
        );
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

    async getFeesCollectorContract(
        contractAddress?: string,
    ): Promise<SmartContract> {
        return this.getSmartContract(
            contractAddress ?? scAddress.feesCollector,
            abiConfig.feesCollector,
            'FeesCollector',
        );
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

    async getLockedTokenWrapperContract() {
        return this.getSmartContract(
            scAddress.lockedTokenWrapper,
            abiConfig.lockedTokenWrapper,
            'LockedTokenWrapper',
        );
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

    async getEnergyUpdateContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.energyUpdate,
            abiConfig.energyUpdate,
            'EnergyUpdate',
        );
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

    async getTokenUnstakeContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.tokenUnstake,
            abiConfig.tokenUnstake,
            'TokenUnstakeModule',
        );
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

    async getEscrowContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.escrow,
            abiConfig.escrow,
            'LkmexTransfer',
        );
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

    async getGovernanceSmartContract(
        governanceAddress: string,
        type: GovernanceType,
    ): Promise<SmartContract> {
        return this.getSmartContract(
            governanceAddress,
            abiConfig.governance[type],
            'GovernanceV2',
        );
    }

    async getPostitionCreatorContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.positionCreator,
            abiConfig.positionCreator,
            'AutoPosCreator',
        );
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

    async getLockedTokenPositionCreatorContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.lockedTokenPositionCreator,
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

    async getComposableTasksSmartContract(): Promise<SmartContract> {
        return this.getSmartContract(
            scAddress.composableTasks,
            abiConfig.composableTasks,
            'ComposableTasksContract',
        );
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

    async getSmartContract(
        contractAddress: string,
        contractAbiPath: string,
        contractInterface: string,
    ): Promise<SmartContract> {
        const key = `${contractInterface}.${contractAddress}`;
        return (
            MXProxyService.smartContracts[key] ||
            this.createSmartContract(
                contractAddress,
                contractAbiPath,
                contractInterface,
            )
        );
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

        return factory
            .createTransactionForExecute({
                sender: Address.newFromBech32(options.sender),
                contract: Address.fromBech32(contractAddress),
                function: options.function,
                gasLimit: BigInt(options.gasLimit),
                arguments: options.arguments ?? [],
                nativeTransferAmount: options.nativeTransferAmount
                    ? BigInt(options.nativeTransferAmount)
                    : BigInt(0),
                tokenTransfers: options.tokenTransfers ?? [],
            })
            .toPlainObject();
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

    private async createSmartContract(
        contractAddress: string,
        contractAbiPath: string,
        contractInterface: string,
    ): Promise<SmartContract> {
        const jsonContent: string = await promises.readFile(contractAbiPath, {
            encoding: 'utf8',
        });
        const json = JSON.parse(jsonContent);
        const newSC = new SmartContract({
            address: Address.fromString(contractAddress),
            abi: AbiRegistry.create(json),
        });
        const key = `${contractInterface}.${contractAddress}`;
        MXProxyService.smartContracts[key] = newSC;
        return newSC;
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
