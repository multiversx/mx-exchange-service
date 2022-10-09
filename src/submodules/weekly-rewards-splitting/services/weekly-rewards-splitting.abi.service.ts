import { Address, AddressValue, Interaction, SmartContract, U32Value } from "@elrondnetwork/erdjs/out";
import { GenericAbiService } from "../../../services/generics/generic.abi.service";
import BigNumber from "bignumber.js";
import { ClaimProgress } from "./progress/progress.compute.service";
import { Injectable } from "@nestjs/common";
import { FeesCollectorAbiService } from "../../../modules/fees-collector/services/fees-collector.abi.service";

@Injectable()
export class WeeklyRewardsSplittingAbiService extends GenericAbiService {

    async getContract(scAddress: string, type: string): Promise<SmartContract> {
        switch (type) {
            case FeesCollectorAbiService.name:
                return FeesCollectorAbiService.getContract(scAddress);
        }
    }

    async currentClaimProgress(scAddress: string, user: string, type: string): Promise<ClaimProgress> {
        const contract = await this.getContract(scAddress, type);
        const interaction: Interaction = contract.methodsExplicit.getCurrentClaimProgress(
            [new AddressValue(Address.fromString(user))]
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async userEnergyForWeek(scAddress: string, user: string, week: number, type: string): Promise<number> {
        const contract = await this.getContract(scAddress, type);
        const interaction: Interaction = contract.methodsExplicit.getUserEnergyForWeek(
            [
                new AddressValue(Address.fromString(user)),
                new U32Value(new BigNumber(week))
            ]
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async lastActiveWeekForUser(scAddress: string, user: string, type: string): Promise<number> {
        const contract = await this.getContract(scAddress, type);
        const interaction: Interaction = contract.methodsExplicit.getLastActiveWeekForUser(
            [new AddressValue(Address.fromString(user))]
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async lastGlobalUpdateWeek(scAddress: string, type: string): Promise<number> {
        const contract = await this.getContract(scAddress, type);
        const interaction: Interaction = contract.methodsExplicit.getLastGlobalUpdateWeek();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async totalRewardsForWeek(scAddress: string, week: number, type: string): Promise<string> {
        const contract = await this.getContract(scAddress, type);
        const interaction: Interaction = contract.methodsExplicit.getTotalRewardsForWeek(
            [new U32Value(new BigNumber(week))]
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async totalEnergyForWeek(scAddress: string, week: number, type: string): Promise<number> {
        const contract = await this.getContract(scAddress, type);
        const interaction: Interaction = contract.methodsExplicit.getTotalEnergyForWeek(
            [new U32Value(new BigNumber(week))]
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async totalLockedTokensForWeek(scAddress: string, week: number, type: string): Promise<number> {
        const contract = await this.getContract(scAddress, type);
        const interaction: Interaction = contract.methodsExplicit.getTotalLockedTokensForWeek(
            [new U32Value(new BigNumber(week))]
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }
}
