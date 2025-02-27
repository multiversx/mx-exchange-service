import {
    Address,
    AddressValue,
    Interaction,
    SmartContract,
    U32Value,
} from '@multiversx/sdk-core';
import { GenericAbiService } from '../../../services/generics/generic.abi.service';
import BigNumber from 'bignumber.js';
import { ClaimProgress } from '../models/weekly-rewards-splitting.model';
import { Injectable } from '@nestjs/common';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { VmQueryError } from '../../../utils/errors.constants';
import { Energy, EnergyType } from '@multiversx/sdk-exchange';
import { ReturnCode } from '@multiversx/sdk-core/out/smartcontracts/returnCode';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { scAddress } from 'src/config';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { WeekTimekeepingComputeService } from 'src/submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { IWeeklyRewardsSplittingAbiService } from '../interfaces';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';

@Injectable()
export class WeeklyRewardsSplittingAbiService
    extends GenericAbiService
    implements IWeeklyRewardsSplittingAbiService
{
    constructor(
        protected readonly mxProxy: MXProxyService,
        private readonly remoteConfig: RemoteConfigGetterService,
        private readonly weekTimekeepCompute: WeekTimekeepingComputeService,
    ) {
        super(mxProxy);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async currentClaimProgress(
        scAddress: string,
        user: string,
    ): Promise<ClaimProgress> {
        return this.currentClaimProgressRaw(scAddress, user);
    }

    async currentClaimProgressRaw(
        scAddress: string,
        user: string,
    ): Promise<ClaimProgress> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getCurrentClaimProgress([
                new AddressValue(Address.fromString(user)),
            ]);
        const response = await this.getGenericData(interaction);
        if (
            (response.returnCode.equals(ReturnCode.UserError) &&
                response.returnMessage === VmQueryError.INPUT_TOO_SHORT) ||
            response.firstValue === null
        ) {
            return {
                energy: {
                    amount: '0',
                    lastUpdateEpoch: 0,
                    totalLockedTokens: '0',
                },
                week: 0,
            };
        }
        const energy = response.firstValue.valueOf().energy;
        const week = response.firstValue.valueOf().week.toNumber();
        return new ClaimProgress({
            energy: Energy.fromDecodedAttributes(energy).toJSON(),
            week,
        });
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async userEnergyForWeek(
        scAddress: string,
        user: string,
        week: number,
    ): Promise<EnergyType> {
        return this.userEnergyForWeekRaw(scAddress, user, week);
    }

    async userEnergyForWeekRaw(
        scAddress: string,
        user: string,
        week: number,
    ): Promise<EnergyType> {
        const contract = await this.getContractHandler(scAddress);
        const endEpochForWeek = await this.weekTimekeepCompute.endEpochForWeek(
            scAddress,
            week,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getUserEnergyForWeek([
                new AddressValue(Address.fromString(user)),
                new U32Value(new BigNumber(week)),
            ]);
        const response = await this.getGenericData(interaction);
        if (
            (response.returnCode.equals(ReturnCode.UserError) &&
                response.returnMessage === VmQueryError.INPUT_TOO_SHORT) ||
            !response.firstValue ||
            !response.firstValue.valueOf()
        ) {
            const claimProgress = await this.currentClaimProgress(
                scAddress,
                user,
            );
            if (claimProgress.week === 0) {
                return {
                    amount: '0',
                    lastUpdateEpoch: 0,
                    totalLockedTokens: '0',
                };
            }
            if (endEpochForWeek > claimProgress.energy.lastUpdateEpoch) {
                claimProgress.energy.amount = new BigNumber(
                    claimProgress.energy.amount,
                )
                    .minus(
                        new BigNumber(
                            claimProgress.energy.totalLockedTokens,
                        ).multipliedBy(
                            endEpochForWeek -
                                claimProgress.energy.lastUpdateEpoch,
                        ),
                    )
                    .toFixed();
                claimProgress.energy.lastUpdateEpoch = endEpochForWeek;
            }

            return claimProgress.energy;
        }
        return Energy.fromDecodedAttributes(
            response.firstValue.valueOf(),
        ).toJSON();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async lastActiveWeekForUser(
        scAddress: string,
        user: string,
    ): Promise<number> {
        return this.lastActiveWeekForUserRaw(scAddress, user);
    }

    async lastActiveWeekForUserRaw(
        scAddress: string,
        user: string,
    ): Promise<number> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getLastActiveWeekForUser([
                new AddressValue(Address.fromString(user)),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'weeklyRewards',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async lastGlobalUpdateWeek(scAddress: string): Promise<number> {
        return this.lastGlobalUpdateWeekRaw(scAddress);
    }

    async lastGlobalUpdateWeekRaw(scAddress: string): Promise<number> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getLastGlobalUpdateWeek();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'weeklyRewards',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async totalRewardsForWeek(
        scAddress: string,
        week: number,
    ): Promise<EsdtTokenPayment[]> {
        return this.totalRewardsForWeekRaw(scAddress, week);
    }

    async totalRewardsForWeekRaw(
        scAddress: string,
        week: number,
    ): Promise<EsdtTokenPayment[]> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getTotalRewardsForWeek([
                new U32Value(new BigNumber(week)),
            ]);
        const response = await this.getGenericData(interaction);
        const rewards = response.firstValue.valueOf().map((raw) => {
            const nonce = raw.token_nonce.toNumber();
            const discriminant = nonce != 0 ? 3 : 1;
            return new EsdtTokenPayment({
                tokenType: discriminant,
                tokenID: raw.token_identifier.toString(),
                nonce: nonce,
                amount: raw.amount.toFixed(),
            });
        });
        return rewards;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'weeklyRewards',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async totalEnergyForWeek(scAddress: string, week: number): Promise<string> {
        return this.totalEnergyForWeekRaw(scAddress, week);
    }

    async totalEnergyForWeekRaw(
        scAddress: string,
        week: number,
    ): Promise<string> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getTotalEnergyForWeek([
                new U32Value(new BigNumber(week)),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'weeklyRewards',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async totalLockedTokensForWeek(
        scAddress: string,
        week: number,
    ): Promise<string> {
        return this.totalLockedTokensForWeekRaw(scAddress, week);
    }

    async totalLockedTokensForWeekRaw(
        scAddress: string,
        week: number,
    ): Promise<string> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getTotalLockedTokensForWeek([
                new U32Value(new BigNumber(week)),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    private async getContractHandler(
        contractAddress: string,
    ): Promise<SmartContract> {
        if (scAddress.feesCollector === contractAddress) {
            return this.mxProxy.getFeesCollectorContract();
        }

        const stakingAddresses = await this.remoteConfig.getStakingAddresses();
        if (stakingAddresses.includes(contractAddress)) {
            return this.mxProxy.getStakingSmartContract(contractAddress);
        }

        return this.mxProxy.getFarmSmartContract(contractAddress);
    }
}
