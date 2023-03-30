import { Inject, Injectable } from '@nestjs/common';
import { scAddress } from '../../../../config';
import { FeesCollectorService } from '../../../fees-collector/services/fees-collector.service';
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
import { StakingProxyGetterService } from '../../../staking-proxy/services/staking.proxy.getter.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FeesCollectorGetterService } from 'src/modules/fees-collector/services/fees-collector.getter.service';

@Injectable()
export class UserEnergyComputeService {
    constructor(
        private readonly farmGetter: FarmGetterFactory,
        private readonly feesCollectorService: FeesCollectorService,
        private readonly feesCollectorGetter: FeesCollectorGetterService,
        private readonly userMetaEsdtService: UserMetaEsdtService,
        private readonly stakeProxyService: StakingProxyService,
        private readonly stakeProxyGetter: StakingProxyGetterService,
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
                    farmGetter.currentClaimProgress(
                        contractAddress,
                        userAddress,
                    ),
                    farmGetter.getCurrentWeek(contractAddress),
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
            this.feesCollectorService.getUserCurrentClaimProgress(
                contractAddress,
                userAddress,
            ),
            this.feesCollectorGetter.getCurrentWeek(contractAddress),
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
        return this.stakeProxyGetter.getLpFarmAddress(stakingProxyAddress);
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
