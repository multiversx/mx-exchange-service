import { Address, AddressValue, Interaction, SmartContract, U32Value } from '@elrondnetwork/erdjs/out';
import { GenericAbiService } from '../../../services/generics/generic.abi.service';
import BigNumber from 'bignumber.js';
import { ClaimProgress } from '../models/weekly-rewards-splitting.model';
import { Injectable } from '@nestjs/common';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { ErrorGetContractHandlerNotSet } from '../../../utils/errors.constants';

@Injectable()
export class WeeklyRewardsSplittingAbiService extends GenericAbiService {
    async currentClaimProgress(scAddress: string, user: string): Promise<ClaimProgress> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getCurrentClaimProgress(
            [new AddressValue(Address.fromString(user))],
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async userEnergyForWeek(scAddress: string, user: string, week: number): Promise<string> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getUserEnergyForWeek(
            [
                new AddressValue(Address.fromString(user)),
                new U32Value(new BigNumber(week)),
            ],
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async lastActiveWeekForUser(scAddress: string, user: string): Promise<number> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getLastActiveWeekForUser(
            [new AddressValue(Address.fromString(user))],
        );
        const response = await this.getGenericData(interaction)
        return response.firstValue.valueOf().toNumber();
    }

    async lastGlobalUpdateWeek(scAddress: string): Promise<number> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getLastGlobalUpdateWeek();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async totalRewardsForWeek(scAddress: string, week: number): Promise<EsdtTokenPayment[]> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getTotalRewardsForWeek(
            [new U32Value(new BigNumber(week))],
        );
        const response = await this.getGenericData(interaction);
        //TODO: returns good value
        return response.firstValue.valueOf();
    }

    async totalEnergyForWeek(scAddress: string, week: number): Promise<string> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getTotalEnergyForWeek(
            [new U32Value(new BigNumber(week))],
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async totalLockedTokensForWeek(scAddress: string, week: number): Promise<string> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getTotalLockedTokensForWeek(
            [new U32Value(new BigNumber(week))]
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    protected getContractHandler: (scAddress: string) => Promise<SmartContract> = scAddress => {
        throw ErrorGetContractHandlerNotSet
    };
}
