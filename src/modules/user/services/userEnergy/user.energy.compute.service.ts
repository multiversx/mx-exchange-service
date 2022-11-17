import { Injectable } from "@nestjs/common";
import { scAddress } from "../../../../config";
import { farmsAddresses } from "../../../../utils/farm.utils";
import { EnergyGetterService } from "../../../energy/services/energy.getter.service";
import { FeesCollectorService } from "../../../fees-collector/services/fees-collector.service";
import { EnergyType } from "@elrondnetwork/erdjs-dex";
import { ClaimProgress } from "../../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model";
import { FarmVersion } from "../../../farm/models/farm.model";
import { FarmFactoryService } from "../../../farm/farm.factory";
import { FarmServiceV2 } from "../../../farm/v2/services/farm.v2.service";
import { ContractType, OutdatedContract } from "../../models/user.model";

@Injectable()
export class UserEnergyComputeService {
    constructor(
        private readonly energyGetter: EnergyGetterService,
        private readonly farmFactory: FarmFactoryService,
        private readonly feesCollectorService: FeesCollectorService,
    ) {
    }

    async computeUserOutdatedContracts(userAddress: string): Promise<OutdatedContract[]> {
        const currentUserEnergy = await this.energyGetter.getEnergyEntryForUser(userAddress);
        const promisesList = farmsAddresses([FarmVersion.V2]).map(
            async address => {
                const farmService = (this.farmFactory.useService(address) as FarmServiceV2)
                const [
                    currentClaimProgress,
                    currentWeek,
                    farmToken
                ] = await Promise.all([
                    farmService.getUserCurrentClaimProgress(
                        address,
                        userAddress,
                    ),
                    farmService.getCurrentWeek(address),
                    farmService.getFarmToken(address)
                ]);

                if (this.isEnergyOutdated(currentUserEnergy, currentClaimProgress)) {
                    return new OutdatedContract({
                        address: address,
                        type: ContractType.Farm,
                        claimProgressOutdated: currentClaimProgress.week != currentWeek,
                        farmToken: farmToken.collection
                    })
                }
                return undefined
            }
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
                })
            );
        }
        return outdatedContracts;
    }

    isEnergyOutdated(currentUserEnergy: EnergyType, currentClaimProgress: ClaimProgress): boolean {
        return currentClaimProgress.week > 0 && currentUserEnergy.amount !== currentClaimProgress.energy.amount
    }
}
