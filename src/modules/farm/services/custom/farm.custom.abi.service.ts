import { Address, Interaction } from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import { AbiFarmService } from '../farm.abi.service';

@Injectable()
export class FarmCustomAbiService extends AbiFarmService {
    async getWhitelist(farmAddress: string): Promise<string[]> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );

        const interaction: Interaction =
            contract.methodsExplicit.getWhitelist();
        const response = await this.getGenericData(interaction);

        return response.firstValue
            .valueOf()
            .map((address: Address) => address.bech32());
    }
}
