import { Address, AddressValue, Interaction, SmartContract, U32Value } from "@elrondnetwork/erdjs/out";
import BigNumber from "bignumber.js";
import { GenericAbiService } from "../../services/generics/generic.abi.service";


export abstract class WeekTimekeepingAbiService extends GenericAbiService {
    abstract getContract(scAddress: string): Promise<SmartContract>

    async getCurrentWeek(scAddress: string): Promise<number> {
        const contract = await this.getContract(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getCurrentWeek();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }
}
