import { Injectable } from "@nestjs/common";
import { scAddress } from "../../../config";
import { farmsAddresses } from "../../../utils/farm.utils";
import { EnergyGetterService } from "../../energy/services/energy.getter.service";
import { FeesCollectorService } from "../../fees-collector/services/fees-collector.service";
import { EnergyType } from "@elrondnetwork/erdjs-dex";
import { ClaimProgress } from "../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model";
import { FarmVersion } from "../../farm/models/farm.model";
import { FarmFactoryService } from "../../farm/farm.factory";
import { FarmServiceV2 } from "../../farm/v2/services/farm.v2.service";

@Injectable()
export class UserEnergyService {
    constructor(
        private readonly energyGetter: EnergyGetterService,
        private readonly farmFactory: FarmFactoryService,
        private readonly feesCollectorService: FeesCollectorService,
    ) {
    }

    async getUserEnergyOutdatedAddresses(userAddress: string) {
        const currentUserEnergy = await this.energyGetter.getEnergyEntryForUser(userAddress);
        const promisesList = farmsAddresses([FarmVersion.V2]).map(
            async address => {
                const currentClaimProgress = await (this.farmFactory.useService(address) as FarmServiceV2).getUserCurrentClaimProgress(
                    address,
                    userAddress,
                )

                if (this.isEnergyOutdated(currentUserEnergy, currentClaimProgress)) {
                    return address
                }
                return ''
            }
        )

        const outdatedAddresses = (await Promise.all(promisesList)).filter(address => address !== '');
        const currentClaimProgress = await this.feesCollectorService.getUserCurrentClaimProgress(scAddress.feesCollector, userAddress);
        if (this.isEnergyOutdated(currentUserEnergy, currentClaimProgress)) {
            outdatedAddresses.push(scAddress.feesCollector);
        }
        return outdatedAddresses;
    }

    isEnergyOutdated(currentUserEnergy: EnergyType, currentClaimProgress: ClaimProgress): boolean {
        return currentClaimProgress.week > 0 && currentUserEnergy.amount !== currentClaimProgress.energy.amount
    }
}
