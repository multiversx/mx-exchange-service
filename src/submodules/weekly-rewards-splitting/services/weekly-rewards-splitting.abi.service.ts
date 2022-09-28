import { Address, AddressValue, Interaction, SmartContract, U32Value } from "@elrondnetwork/erdjs/out";
import { GenericAbiService } from "../../../services/generics/generic.abi.service";
import BigNumber from "bignumber.js";


export abstract class WeeklyRewardsSplittingAbiService extends GenericAbiService {
    abstract getContract(address: string): Promise<[SmartContract, string]>

    abstract outdatedVersion(version: string): boolean

    //TODO: add currentClaimProgress

    async userEnergyForWeek(address: string, user: string, week: number): Promise<number> {
        const [contract, version] = await this.getContract(address);
        if (this.outdatedVersion(version)) {
            return null;
        }

        const interaction: Interaction = contract.methodsExplicit.userEnergyForWeek(
            [
                new AddressValue(Address.fromString(user)),
                new U32Value(new BigNumber(week))
            ]
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async lastActiveWeekForUser(address: string, user: string): Promise<number> {
        const [contract, version] = await this.getContract(address);
        if (this.outdatedVersion(version)) {
            return null;
        }

        const interaction: Interaction = contract.methodsExplicit.lastActiveWeekForUser(
            [new AddressValue(Address.fromString(user))]
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async lastGlobalUpdateWeek(address: string): Promise<number> {
        const [contract, version] = await this.getContract(address);
        if (this.outdatedVersion(version)) {
            return null;
        }

        const interaction: Interaction = contract.methodsExplicit.lastGlobalUpdateWeek();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async totalRewardsForWeek(address: string, week: number): Promise<number> {
        const [contract, version] = await this.getContract(address);
        if (this.outdatedVersion(version)) {
            return null;
        }

        const interaction: Interaction = contract.methodsExplicit.totalRewardsForWeek(
            [new U32Value(new BigNumber(week))]
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async totalEnergyForWeek(address: string, week: number): Promise<number> {
        const [contract, version] = await this.getContract(address);
        if (this.outdatedVersion(version)) {
            return null;
        }

        const interaction: Interaction = contract.methodsExplicit.totalEnergyForWeek(
            [new U32Value(new BigNumber(week))]
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async totalLockedTokensForWeek(address: string, week: number): Promise<number> {
        const [contract, version] = await this.getContract(address);
        if (this.outdatedVersion(version)) {
            return null;
        }

        const interaction: Interaction = contract.methodsExplicit.totalLockedTokensForWeek(
            [new U32Value(new BigNumber(week))]
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }
}
