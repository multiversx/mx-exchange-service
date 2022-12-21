import { Interaction, SmartContract } from '@elrondnetwork/erdjs/out';
import { GenericAbiService } from '../../../services/generics/generic.abi.service';
import { ErrorGetContractHandlerNotSet } from '../../../utils/errors.constants';
import { IWeekTimekeepingAbiService } from '../interfaces';


export class WeekTimekeepingAbiService extends GenericAbiService implements IWeekTimekeepingAbiService {

    async getCurrentWeek(scAddress: string): Promise<number> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getCurrentWeek();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async firstWeekStartEpoch(scAddress: string): Promise<number> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getFirstWeekStartEpoch();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    protected getContractHandler: (scAddress: string) => Promise<SmartContract> = scAddress => {
        throw ErrorGetContractHandlerNotSet()
    };
}
