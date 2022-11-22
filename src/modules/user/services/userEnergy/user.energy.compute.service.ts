import { Injectable } from '@nestjs/common';
import { scAddress } from '../../../../config';
import { farmsAddresses } from '../../../../utils/farm.utils';
import { EnergyGetterService } from '../../../energy/services/energy.getter.service';
import { FeesCollectorService } from '../../../fees-collector/services/fees-collector.service';
import { EnergyType } from '@elrondnetwork/erdjs-dex';
import { ClaimProgress } from '../../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { FarmVersion } from '../../../farm/models/farm.model';
import { ContractType, OutdatedContract, UserDualYiledToken, UserLockedFarmTokenV2 } from '../../models/user.model';
import { FarmGetterFactory } from '../../../farm/farm.getter.factory';
import { FarmGetterServiceV2 } from '../../../farm/v2/services/farm.v2.getter.service';
import { UserMetaEsdtService } from '../user.metaEsdt.service';
import { PaginationArgs } from '../../../dex.model';
import { ProxyFarmGetterService } from '../../../proxy/services/proxy-farm/proxy-farm.getter.service';
import { ProxyService } from '../../../proxy/services/proxy.service';

@Injectable()
export class UserEnergyComputeService {
    constructor(
        private readonly energyGetter: EnergyGetterService,
        private readonly farmGetter: FarmGetterFactory,
        private readonly feesCollectorService: FeesCollectorService,
        private readonly userMetaEsdtService: UserMetaEsdtService,
        private readonly proxyFarmGetter: ProxyFarmGetterService,
        private readonly proxyService: ProxyService,
    ) {
    }

    async computeUserOutdatedContracts(userAddress: string): Promise<OutdatedContract[]> {
        const maxPagination = new PaginationArgs({
            limit: 100,
            offset: 0,
        });
        const [
            farmTokens,
            farmLockedTokens,
            dualYieldTokens,
        ] = await Promise.all([
            this.userMetaEsdtService.getUserFarmTokens(
                userAddress,
                maxPagination,
            ),
            this.userMetaEsdtService.getUserLockedFarmTokensV2(
                userAddress,
                maxPagination,
            ),
            this.userMetaEsdtService.getUserDualYieldTokens(
                userAddress,
                maxPagination,
            ),
        ])

        let userActiveFarmAddresses = farmTokens.map(token => token.creator);
        const promises = [ ...farmLockedTokens, ...dualYieldTokens]
            .map(token => {
                return this.decodeAndGetFarmAddress(token);
            })
        userActiveFarmAddresses = userActiveFarmAddresses.concat(
            await Promise.all(promises),
        );
        userActiveFarmAddresses = [...new Set(userActiveFarmAddresses)]

        const currentUserEnergy = await this.energyGetter.getEnergyEntryForUser(userAddress);
        const promisesList = farmsAddresses([FarmVersion.V2]).map(
            async address => {
                const farmGetter = (this.farmGetter.useGetter(address) as FarmGetterServiceV2)
                const [
                    currentClaimProgress,
                    currentWeek,
                    farmToken,
                ] = await Promise.all([
                    farmGetter.currentClaimProgress(
                        address,
                        userAddress,
                    ),
                    farmGetter.getCurrentWeek(address),
                    farmGetter.getFarmToken(address),
                ]);
                if (!userActiveFarmAddresses.includes(address)) {
                    return undefined;
                }
                if (this.isEnergyOutdated(currentUserEnergy, currentClaimProgress)) {
                    return new OutdatedContract({
                        address: address,
                        type: ContractType.Farm,
                        claimProgressOutdated: currentClaimProgress.week != currentWeek,
                        farmToken: farmToken.collection,
                    })
                }
                return undefined
            },
        )

        const outdatedContracts = (await Promise.all(promisesList)).filter(contract => contract !== undefined);

        const [
            currentClaimProgress,
            currentWeek,
        ] = await Promise.all([
            this.feesCollectorService.getUserCurrentClaimProgress(
                scAddress.feesCollector,
                userAddress,
            ),
            this.feesCollectorService.getCurrentWeek(scAddress.feesCollector),
        ]);

        if (this.isEnergyOutdated(currentUserEnergy, currentClaimProgress)) {
            outdatedContracts.push(
                new OutdatedContract({
                    address: scAddress.feesCollector,
                    type: ContractType.FeesCollector,
                    claimProgressOutdated: currentClaimProgress.week != currentWeek,
                }),
            );
        }
        return outdatedContracts;
    }

    decodeAndGetFarmAddress(token: UserLockedFarmTokenV2 | UserDualYiledToken) {
        const decodedWFMTAttributes =
            this.proxyService.getWrappedFarmTokenAttributesV2({
                batchAttributes: [
                    {
                        identifier: token.identifier,
                        attributes: token.attributes,
                    },
                ],
            });

        return this.farmGetter.getFarmAddressByFarmTokenID(decodedWFMTAttributes[0].farmToken.tokenIdentifier)
    }

    isEnergyOutdated(currentUserEnergy: EnergyType, currentClaimProgress: ClaimProgress): boolean {
        return currentClaimProgress.week > 0 && currentUserEnergy.amount !== currentClaimProgress.energy.amount
    }
}
