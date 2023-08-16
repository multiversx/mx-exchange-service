import { Injectable } from '@nestjs/common';
import { constantsConfig, scAddress } from '../../../../config';
import { EnergyType } from '@multiversx/sdk-exchange';
import { ClaimProgress } from '../../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { ContractType, OutdatedContract, UserDualYiledToken, UserLockedFarmTokenV2 } from '../../models/user.model';
import { UserMetaEsdtService } from '../user.metaEsdt.service';
import { PaginationArgs } from '../../../dex.model';
import { ProxyService } from '../../../proxy/services/proxy.service';
import { StakingProxyService } from '../../../staking-proxy/services/staking.proxy.service';
import { FarmVersion } from '../../../farm/models/farm.model';
import { farmVersion } from '../../../../utils/farm.utils';
import { BigNumber } from 'bignumber.js';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import {
    WeeklyRewardsSplittingAbiService,
} from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { StakingProxyAbiService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';
import { FarmAbiFactory } from 'src/modules/farm/farm.abi.factory';
import { FarmFactoryService } from 'src/modules/farm/farm.factory';
import { FarmServiceV2 } from 'src/modules/farm/v2/services/farm.v2.service';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { oneMinute } from 'src/helpers/helpers';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';

@Injectable()
export class UserEnergyComputeService {
    constructor(
        private readonly farmAbi: FarmAbiFactory,
        private readonly farmService: FarmFactoryService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly userMetaEsdtService: UserMetaEsdtService,
        private readonly stakeProxyService: StakingProxyService,
        private readonly stakeProxyAbi: StakingProxyAbiService,
        private readonly energyAbi: EnergyAbiService,
        private readonly proxyService: ProxyService,
    ) {}

    async getUserOutdatedContracts(
        userAddress: string,
        skipFeesCollector = false,
    ): Promise<OutdatedContract[]> {
        const activeFarms = await this.userActiveFarmsV2(userAddress);

        const promises = activeFarms.map((farm) =>
            this.outdatedContract(userAddress, farm),
        );
        if (!skipFeesCollector) {
            promises.push(
                this.outdatedContract(userAddress, scAddress.feesCollector),
            );
        }

        const outdatedContracts = await Promise.all(promises);
        return outdatedContracts.filter(
            (contract) => contract && contract.address,
        );
    }

    @GetOrSetCache({
        baseKey: 'userEnergy',
        remoteTtl: oneMinute() * 10,
    })
    async outdatedContract(
        userAddress: string,
        contractAddress: string,
    ): Promise<OutdatedContract> {
        return await this.computeUserOutdatedContract(
            userAddress,
            contractAddress,
        );
    }

    async computeUserOutdatedContract(
        userAddress: string,
        contractAddress: string,
    ): Promise<OutdatedContract> {
        const isFarmAddress = contractAddress !== scAddress.feesCollector;

        if (isFarmAddress) {
            return await this.computeFarmOutdatedContract(
                userAddress,
                contractAddress,
            );
        }

        return await this.computeFeesCollectorOutdatedContract(userAddress);
    }

    async computeFarmOutdatedContract(
        userAddress: string,
        contractAddress: string,
    ): Promise<OutdatedContract> {
        const farmService = this.farmService.useService(
            contractAddress,
        ) as FarmServiceV2;
        const [currentClaimProgress, currentWeek, farmToken, userEnergy] =
            await Promise.all([
                this.weeklyRewardsSplittingAbi.currentClaimProgress(
                    contractAddress,
                    userAddress,
                ),
                this.weekTimekeepingAbi.currentWeek(contractAddress),
                farmService.getFarmToken(contractAddress),
                this.energyAbi.energyEntryForUser(userAddress),
            ]);

        if (this.isEnergyOutdated(userEnergy, currentClaimProgress)) {
            return new OutdatedContract({
                address: contractAddress,
                type: ContractType.Farm,
                claimProgressOutdated:
                    currentClaimProgress.week !== currentWeek,
                farmToken: farmToken.collection,
            });
        }
        return new OutdatedContract();
    }

    async computeFeesCollectorOutdatedContract(
        userAddress: string,
    ): Promise<OutdatedContract> {
        const [currentClaimProgress, currentWeek, userEnergy] =
            await Promise.all([
                this.weeklyRewardsSplittingAbi.currentClaimProgress(
                    scAddress.feesCollector,
                    userAddress,
                ),
                this.weekTimekeepingAbi.currentWeek(scAddress.feesCollector),
                this.energyAbi.energyEntryForUser(userAddress),
            ]);

        if (this.isEnergyOutdated(userEnergy, currentClaimProgress)) {
            return new OutdatedContract({
                address: scAddress.feesCollector,
                type: ContractType.FeesCollector,
                claimProgressOutdated: currentClaimProgress.week != currentWeek,
            });
        }
        return new OutdatedContract();
    }

    @GetOrSetCache({
        baseKey: 'userEnergy',
        remoteTtl: oneMinute(),
    })
    async userActiveFarmsV2(userAddress: string): Promise<string[]> {
        return await this.computeActiveFarmsV2ForUser(userAddress);
    }

    async computeActiveFarmsV2ForUser(userAddress: string): Promise<string[]> {
        const maxPagination = new PaginationArgs({
            limit: 100,
            offset: 0,
        });
        const [farmTokens, farmLockedTokens, dualYieldTokens] =
            await Promise.all([
                this.userMetaEsdtService.getUserFarmTokens(
                    userAddress,
                    maxPagination,
                    false,
                ),
                this.userMetaEsdtService.getUserLockedFarmTokensV2(
                    userAddress,
                    maxPagination,
                    false,
                ),
                this.userMetaEsdtService.getUserDualYieldTokens(
                    userAddress,
                    maxPagination,
                    false,
                ),
            ]);

        let userActiveFarmAddresses = farmTokens.map((token) => token.creator);
        const promisesFarmLockedTokens = farmLockedTokens.map((token) => {
            return this.decodeAndGetFarmAddressFarmLockedTokens(token);
        });
        const promisesDualYieldTokens = dualYieldTokens.map((token) => {
            return this.getFarmAddressForDualYieldToken(token);
        });

        userActiveFarmAddresses = userActiveFarmAddresses.concat(
            await Promise.all([
                ...promisesFarmLockedTokens,
                ...promisesDualYieldTokens,
            ]),
        );
        return [...new Set(userActiveFarmAddresses)].filter(
            (address) => farmVersion(address) === FarmVersion.V2,
        );
    }

    decodeAndGetFarmAddressFarmLockedTokens(token: UserLockedFarmTokenV2) {
        const decodedWFMTAttributes =
            this.proxyService.getWrappedFarmTokenAttributesV2({
                batchAttributes: [
                    {
                        identifier: token.identifier,
                        attributes: token.attributes,
                    },
                ],
            });

        return this.farmAbi.getFarmAddressByFarmTokenID(
            decodedWFMTAttributes[0].farmToken.tokenIdentifier,
        );
    }

    async getFarmAddressForDualYieldToken(token: UserDualYiledToken) {
        if (!token || token === undefined) {
            return undefined;
        }

        const stakingProxyAddress =
            await this.stakeProxyService.getStakingProxyAddressByDualYieldTokenID(
                token.collection,
            );
        return this.stakeProxyAbi.lpFarmAddress(stakingProxyAddress);
    }

    isEnergyOutdated(
        currentUserEnergy: EnergyType,
        currentClaimProgress: ClaimProgress,
    ): boolean {
        if (currentClaimProgress.week === 0) {
            return false;
        }

        if (
            currentUserEnergy.lastUpdateEpoch >
            currentClaimProgress.energy.lastUpdateEpoch
        ) {
            const epochsDiff =
                currentUserEnergy.lastUpdateEpoch -
                currentClaimProgress.energy.lastUpdateEpoch;
            currentClaimProgress.energy.amount = new BigNumber(
                currentClaimProgress.energy.amount,
            )
                .minus(
                    new BigNumber(epochsDiff).multipliedBy(
                        currentClaimProgress.energy.totalLockedTokens,
                    ),
                )
                .toFixed();
        }

        if (
            currentClaimProgress.energy.lastUpdateEpoch >
            currentUserEnergy.lastUpdateEpoch
        ) {
            const epochsDiff =
                currentClaimProgress.energy.lastUpdateEpoch -
                currentUserEnergy.lastUpdateEpoch;
            currentUserEnergy.amount = new BigNumber(currentUserEnergy.amount)
                .minus(
                    new BigNumber(epochsDiff).multipliedBy(
                        currentUserEnergy.totalLockedTokens,
                    ),
                )
                .toFixed();
        }
        const energyDifference = new BigNumber(currentUserEnergy.amount).minus(currentClaimProgress.energy.amount).abs();
        const averageAmount = new BigNumber(currentUserEnergy.amount).plus(currentClaimProgress.energy.amount).dividedBy(2);
        const relativeDifferencePercentage = energyDifference.dividedBy(averageAmount).multipliedBy(100);

        return relativeDifferencePercentage.isGreaterThan(constantsConfig.OUTDATED_ENERGY_THRESHOLD_PERCENTAGE);
    }
}
