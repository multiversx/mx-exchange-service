import { Interaction, SmartContract } from "@elrondnetwork/erdjs/out";
import { GenericAbiService } from "../../../services/generics/generic.abi.service";
import { FeesCollectorAbiService } from "../../../modules/fees-collector/services/fees-collector.abi.service";


export class WeekTimekeepingAbiService extends GenericAbiService {

    async getContract(scAddress: string, type: string): Promise<SmartContract> {
        switch (type) {
            case FeesCollectorAbiService.name:
                return FeesCollectorAbiService.getContract(scAddress);
        }
    }

    async getCurrentWeek(scAddress: string, type: string): Promise<number> {
        const contract = await this.getContract(scAddress, type);
        const interaction: Interaction = contract.methodsExplicit.getCurrentWeek();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async firstWeekStartEpoch(scAddress: string, type: string): Promise<number> {
        const contract = await this.getContract(scAddress, type);
        const interaction: Interaction = contract.methodsExplicit.firstWeekStartEpoch();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }
}
