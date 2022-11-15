import { Injectable } from "@nestjs/common";
import { scAddress } from "../../../config";
import { farmsAddresses } from "../../../utils/farm.utils";
import { EnergyGetterService } from "../../energy/services/energy.getter.service";
import { FarmServiceV2 } from "../../farm/v2/services/farm.v2.service";
import { FeesCollectorService } from "../../fees-collector/services/fees-collector.service";

@Injectable()
export class UserEnergyService {
    constructor(
        private readonly energyGetter: EnergyGetterService,
        private readonly farmService: FarmServiceV2,
        private readonly feesCollectorService: FeesCollectorService,
    ) {
    }

    async getUserEnergyOutdatedAddresses(userAddress: string) {
        const currentUserEnergy = await this.energyGetter.getEnergyEntryForUser(userAddress);
        const promisesList = farmsAddresses(["v2"]).map(
            async address => {
                const currentClaimProgress = await this.farmService.getUserCurrentClaimProgress(
                    address,
                    userAddress,
                )

                if (currentClaimProgress !== undefined && currentUserEnergy.amount !== currentClaimProgress?.energy?.amount) {
                    return address
                }
                return ''
            }
        )

        const outdatedAddresses = (await Promise.all(promisesList)).filter(address => address != '');
        const currentClaimProgress = await this.feesCollectorService.getUserCurrentClaimProgress(scAddress.feesCollector, userAddress);
        if (currentUserEnergy.amount !== currentClaimProgress.energy.amount) {
            outdatedAddresses.push(scAddress.feesCollector);
        }
        return outdatedAddresses;
    }


}