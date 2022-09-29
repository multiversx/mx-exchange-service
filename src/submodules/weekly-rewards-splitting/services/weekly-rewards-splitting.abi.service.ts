import { Address, AddressValue, Interaction, SmartContract, U32Value } from "@elrondnetwork/erdjs/out";
import { GenericAbiService } from "../../../services/generics/generic.abi.service";
import BigNumber from "bignumber.js";


export abstract class WeeklyRewardsSplittingAbiService extends GenericAbiService {
    abstract getContract(scAddress: string): Promise<SmartContract>
    //TODO: add currentClaimProgress

    async userEnergyForWeek(scAddress: string, user: string, week: number): Promise<number> {
        const contract = await this.getContract(scAddress);
        const interaction: Interaction = contract.methodsExplicit.userEnergyForWeek(
            [
                new AddressValue(Address.fromString(user)),
                new U32Value(new BigNumber(week))
            ]
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async lastActiveWeekForUser(scAddress: string, user: string): Promise<number> {
        const contract = await this.getContract(scAddress);
        const interaction: Interaction = contract.methodsExplicit.lastActiveWeekForUser(
            [new AddressValue(Address.fromString(user))]
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async lastGlobalUpdateWeek(scAddress: string): Promise<number> {
        const contract = await this.getContract(scAddress);
        const interaction: Interaction = contract.methodsExplicit.lastGlobalUpdateWeek();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async totalRewardsForWeek(scAddress: string, week: number): Promise<number> {
        const contract = await this.getContract(scAddress);
        const interaction: Interaction = contract.methodsExplicit.totalRewardsForWeek(
            [new U32Value(new BigNumber(week))]
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async totalEnergyForWeek(scAddress: string, week: number): Promise<number> {
        const contract = await this.getContract(scAddress);
        const interaction: Interaction = contract.methodsExplicit.totalEnergyForWeek(
            [new U32Value(new BigNumber(week))]
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async totalLockedTokensForWeek(scAddress: string, week: number): Promise<number> {
        const contract = await this.getContract(scAddress);
        const interaction: Interaction = contract.methodsExplicit.totalLockedTokensForWeek(
            [new U32Value(new BigNumber(week))]
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }
}
