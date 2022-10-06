import { Interaction, SmartContract } from "@elrondnetwork/erdjs/out";
import { GenericAbiService } from "../../../services/generics/generic.abi.service";


export abstract class WeekTimekeepingAbiService extends GenericAbiService {
    abstract getContract(scAddress: string): Promise<SmartContract>

    async getCurrentWeek(scAddress: string): Promise<number> {
        const contract = await this.getContract(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getCurrentWeek();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async firstWeekStartEpoch(scAddress: string): Promise<number> {
        const contract = await this.getContract(scAddress);
        const interaction: Interaction = contract.methodsExplicit.firstWeekStartEpoch();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }
}
