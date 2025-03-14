import { Injectable } from '@nestjs/common';
import { Interaction } from '@multiversx/sdk-core/out/smartcontracts/interaction';
import { U64Value } from '@multiversx/sdk-core';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { PhaseModel } from '../models/price.discovery.model';
import BigNumber from 'bignumber.js';
import { constantsConfig } from 'src/config';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { IPriceDiscoveryAbiService } from './interfaces';
import { CacheService } from 'src/services/caching/cache.service';
import { getAllKeys } from 'src/utils/get.many.utils';

@Injectable()
export class PriceDiscoveryAbiService
    extends GenericAbiService
    implements IPriceDiscoveryAbiService
{
    constructor(
        protected readonly mxProxy: MXProxyService,
        private readonly cachingService: CacheService,
    ) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async launchedTokenID(priceDiscoveryAddress: string): Promise<string> {
        return await this.getLaunchedTokenIDRaw(priceDiscoveryAddress);
    }

    async getLaunchedTokenIDRaw(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLaunchedTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async acceptedTokenID(priceDiscoveryAddress: string): Promise<string> {
        return await this.getAcceptedTokenIDRaw(priceDiscoveryAddress);
    }

    async getAcceptedTokenIDRaw(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getAcceptedTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async redeemTokenID(priceDiscoveryAddress: string): Promise<string> {
        return await this.getRedeemTokenIDRaw(priceDiscoveryAddress);
    }

    async getRedeemTokenIDRaw(priceDiscoveryAddress: string): Promise<string> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getRedeemTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getAllRedeemTokenIds(
        priceDiscoveryAddresses: string[],
    ): Promise<string[]> {
        return await getAllKeys<string>(
            this.cachingService,
            priceDiscoveryAddresses,
            'priceDiscovery.redeemTokenID',
            this.redeemTokenID.bind(this),
            CacheTtlInfo.Token,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async launchedTokenAmount(priceDiscoveryAddress: string): Promise<string> {
        return await this.getLaunchedTokenBalanceRaw(priceDiscoveryAddress);
    }

    async getLaunchedTokenBalanceRaw(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLaunchedTokenBalance();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async acceptedTokenAmount(priceDiscoveryAddress: string): Promise<string> {
        return await this.getAcceptedTokenBalanceRaw(priceDiscoveryAddress);
    }

    async getAcceptedTokenBalanceRaw(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getAcceptedTokenBalance();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async launchedTokenRedeemAmount(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return await this.getLaunchedTokenRedeemBalanceRaw(
            priceDiscoveryAddress,
        );
    }

    async getLaunchedTokenRedeemBalanceRaw(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getRedeemTokenTotalCirculatingSupply([
                new U64Value(new BigNumber(1)),
            ]);

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async acceptedTokenRedeemAmount(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return await this.getAcceptedTokenRedeemBalanceRaw(
            priceDiscoveryAddress,
        );
    }

    async getAcceptedTokenRedeemBalanceRaw(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getRedeemTokenTotalCirculatingSupply([
                new U64Value(new BigNumber(2)),
            ]);

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async startBlock(priceDiscoveryAddress: string): Promise<number> {
        return await this.getStartBlockRaw(priceDiscoveryAddress);
    }

    async getStartBlockRaw(priceDiscoveryAddress: string): Promise<number> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getStartBlock();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async endBlock(priceDiscoveryAddress: string): Promise<number> {
        return await this.getEndBlockRaw(priceDiscoveryAddress);
    }

    async getEndBlockRaw(priceDiscoveryAddress: string): Promise<number> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction = contract.methodsExplicit.getEndBlock();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async currentPhase(priceDiscoveryAddress: string): Promise<PhaseModel> {
        return await this.getCurrentPhaseRaw(priceDiscoveryAddress);
    }

    async getCurrentPhaseRaw(
        priceDiscoveryAddress: string,
    ): Promise<PhaseModel> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getCurrentPhase();

        const response = await this.getGenericData(interaction);

        const phaseName = response.firstValue.valueOf().name;
        const penalty = response.firstValue.valueOf().fields.penalty_percentage;
        const penaltyPercent = penalty
            ? new BigNumber(penalty).dividedBy(
                  constantsConfig.MAX_PERCENTAGE_PRICE_DISCOVERY,
              )
            : new BigNumber(0);

        return new PhaseModel({
            name: phaseName,
            penaltyPercent: penaltyPercent.toNumber(),
        });
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async minLaunchedTokenPrice(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return await this.getMinLaunchedTokenPriceRaw(priceDiscoveryAddress);
    }

    async getMinLaunchedTokenPriceRaw(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getMinLaunchedTokenPrice();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async noLimitPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return await this.getNoLimitPhaseDurationBlocksRaw(
            priceDiscoveryAddress,
        );
    }

    async getNoLimitPhaseDurationBlocksRaw(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getNoLimitPhaseDurationBlocks();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async linearPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return await this.getLinearPenaltyPhaseDurationBlocksRaw(
            priceDiscoveryAddress,
        );
    }

    async getLinearPenaltyPhaseDurationBlocksRaw(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLinearPenaltyPhaseDurationBlocks();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async fixedPenaltyPhaseDurationBlocks(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return await this.getFixedPenaltyPhaseDurationBlocksRaw(
            priceDiscoveryAddress,
        );
    }

    async getFixedPenaltyPhaseDurationBlocksRaw(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getFixedPenaltyPhaseDurationBlocks();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async lockingScAddress(priceDiscoveryAddress: string): Promise<string> {
        return await this.getLockingScAddressRaw(priceDiscoveryAddress);
    }

    async getLockingScAddressRaw(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLockingScAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async unlockEpoch(priceDiscoveryAddress: string): Promise<number> {
        return await this.getUnlockEpochRaw(priceDiscoveryAddress);
    }

    async getUnlockEpochRaw(priceDiscoveryAddress: string): Promise<number> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getUnlockEpoch();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async penaltyMinPercentage(priceDiscoveryAddress: string): Promise<number> {
        return await this.getPenaltyMinPercentageRaw(priceDiscoveryAddress);
    }

    async getPenaltyMinPercentageRaw(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getPenaltyMinPercentage();
        const response = await this.getGenericData(interaction);
        const rawPenalty: BigNumber = response.firstValue.valueOf();
        return rawPenalty
            .dividedBy(constantsConfig.MAX_PERCENTAGE_PRICE_DISCOVERY)
            .toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async penaltyMaxPercentage(priceDiscoveryAddress: string): Promise<number> {
        return await this.getPenaltyMaxPercentageRaw(priceDiscoveryAddress);
    }

    async getPenaltyMaxPercentageRaw(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getPenaltyMaxPercentage();
        const response = await this.getGenericData(interaction);
        const rawPenalty: BigNumber = response.firstValue.valueOf();
        return rawPenalty
            .dividedBy(constantsConfig.MAX_PERCENTAGE_PRICE_DISCOVERY)
            .toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async fixedPenaltyPercentage(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        return await this.getFixedPenaltyPercentageRaw(priceDiscoveryAddress);
    }

    async getFixedPenaltyPercentageRaw(
        priceDiscoveryAddress: string,
    ): Promise<number> {
        const contract = await this.mxProxy.getPriceDiscoverySmartContract(
            priceDiscoveryAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getFixedPenaltyPercentage();
        const response = await this.getGenericData(interaction);
        const rawPenalty: BigNumber = response.firstValue.valueOf();
        return rawPenalty
            .dividedBy(constantsConfig.MAX_PERCENTAGE_PRICE_DISCOVERY)
            .toNumber();
    }
}
