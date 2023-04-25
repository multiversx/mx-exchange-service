import { Inject, Injectable } from '@nestjs/common';
import { scAddress } from '../../../../config';
import { EnergyType } from '@multiversx/sdk-exchange';
import { ClaimProgress } from '../../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import {
    ContractType,
    OutdatedContract,
    UserDualYiledToken,
    UserLockedFarmTokenV2,
} from '../../models/user.model';
import { FarmGetterFactory } from '../../../farm/farm.getter.factory';
import { FarmGetterServiceV2 } from '../../../farm/v2/services/farm.v2.getter.service';
import { UserMetaEsdtService } from '../user.metaEsdt.service';
import { PaginationArgs } from '../../../dex.model';
import { ProxyService } from '../../../proxy/services/proxy.service';
import { StakingProxyService } from '../../../staking-proxy/services/staking.proxy.service';
import { FarmVersion } from '../../../farm/models/farm.model';
import { farmVersion } from '../../../../utils/farm.utils';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { StakingProxyAbiService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';

@Injectable()
export class UserEnergyComputeService {
    constructor(
        private readonly farmGetter: FarmGetterFactory,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly userMetaEsdtService: UserMetaEsdtService,
        private readonly stakeProxyService: StakingProxyService,
        private readonly stakeProxyAbi: StakingProxyAbiService,
        private readonly proxyService: ProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async computeUserOutdatedContract(
        userAddress: string,
        userEnergy: EnergyType,
        contractAddress: string,
    ): Promise<OutdatedContract> {
        const isFarmAddress = contractAddress !== scAddress.feesCollector;

        if (isFarmAddress) {
            const farmGetter = this.farmGetter.useGetter(
                contractAddress,
            ) as FarmGetterServiceV2;
            const [currentClaimProgress, currentWeek, farmToken] =
                await Promise.all([
                    this.weeklyRewardsSplittingAbi.currentClaimProgress(
                        contractAddress,
                        userAddress,
                    ),
                    this.weekTimekeepingAbi.currentWeek(contractAddress),
                    farmGetter.getFarmToken(contractAddress),
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

        const [currentClaimProgress, currentWeek] = await Promise.all([
            this.weeklyRewardsSplittingAbi.currentClaimProgress(
                contractAddress,
                userAddress,
            ),
            this.weekTimekeepingAbi.currentWeek(contractAddress),
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

        return this.farmGetter.getFarmAddressByFarmTokenID(
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
            currentUserEnergy.amount = new BigNumber(currentUserEnergy.amount)
                .minus(
                    new BigNumber(epochsDiff).multipliedBy(
                        currentUserEnergy.totalLockedTokens,
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
        return currentUserEnergy.amount !== currentClaimProgress.energy.amount;
    }
}
