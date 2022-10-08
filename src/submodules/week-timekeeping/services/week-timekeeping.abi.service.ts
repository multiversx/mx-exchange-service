import { Interaction, SmartContract } from "@elrondnetwork/erdjs/out";
import { GenericAbiService } from "../../../services/generics/generic.abi.service";


export class WeekTimekeepingAbiService extends GenericAbiService {
    protected getContractHandler: (scAddress: string) => Promise<SmartContract> = scAddress => { throw new Error("getContract")};

    async getCurrentWeek(scAddress: string): Promise<number> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getCurrentWeek();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async firstWeekStartEpoch(scAddress: string): Promise<number> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction = contract.methodsExplicit.firstWeekStartEpoch();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }
}
