import { Interaction } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { IStakingProxyAbiService } from './interfaces';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';

@Injectable()
export class StakingProxyAbiService
    extends GenericAbiService
    implements IStakingProxyAbiService
{
    constructor(
        protected readonly mxProxy: MXProxyService,
        private readonly apiService: MXApiService,
    ) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stakeProxy',
        remoteTtl: Constants.oneHour(),
    })
    async lpFarmAddress(stakingProxyAddress: string): Promise<string> {
        return await this.getlpFarmAddressRaw(stakingProxyAddress);
    }

    async getlpFarmAddressRaw(stakingProxyAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLpFarmAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stakeProxy',
        remoteTtl: Constants.oneHour(),
    })
    async stakingFarmAddress(stakingProxyAddress: string): Promise<string> {
        return await this.getStakingFarmAddressRaw(stakingProxyAddress);
    }

    async getStakingFarmAddressRaw(
        stakingProxyAddress: string,
    ): Promise<string> {
        const contract = await this.mxProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getStakingFarmAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stakeProxy',
        remoteTtl: Constants.oneHour(),
    })
    async pairAddress(stakingProxyAddress: string): Promise<string> {
        return await this.getPairAddressRaw(stakingProxyAddress);
    }

    async getPairAddressRaw(stakingProxyAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getPairAddress();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stakeProxy',
        remoteTtl: Constants.oneHour(),
    })
    async stakingTokenID(stakingProxyAddress: string): Promise<string> {
        return await this.getStakingTokenIDRaw(stakingProxyAddress);
    }

    async getStakingTokenIDRaw(stakingProxyAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getStakingTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stakeProxy',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async farmTokenID(stakingProxyAddress: string): Promise<string> {
        return await this.getFarmTokenIDRaw(stakingProxyAddress);
    }

    async getFarmTokenIDRaw(stakingProxyAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getFarmTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stakeProxy',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async dualYieldTokenID(stakingProxyAddress: string): Promise<string> {
        return await this.getDualYieldTokenIDRaw(stakingProxyAddress);
    }

    async getDualYieldTokenIDRaw(stakingProxyAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getDualYieldTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stakeProxy',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async lpFarmTokenID(stakingProxyAddress: string): Promise<string> {
        return await this.getLpFarmTokenIDRaw(stakingProxyAddress);
    }

    async getLpFarmTokenIDRaw(stakingProxyAddress: string): Promise<string> {
        const contract = await this.mxProxy.getStakingProxySmartContract(
            stakingProxyAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLpFarmTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'stakeProxy',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async stakingProxyDeployedTimestamp(
        stakingProxyAddress: string,
    ): Promise<number> {
        return await this.getStakingProxyDeployedTimestampRaw(
            stakingProxyAddress,
        );
    }

    async getStakingProxyDeployedTimestampRaw(
        stakingProxyAddress: string,
    ): Promise<number | undefined> {
        try {
            const addressDetails = await this.apiService.getAccountStats(
                stakingProxyAddress,
            );
            return addressDetails.deployedAt ?? undefined;
        } catch (error) {
            if (error.message.includes('Account not found')) {
                return undefined;
            }
            throw error;
        }
    }
}
