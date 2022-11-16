import { Injectable } from "@nestjs/common";
import { elrondConfig, gasConfig } from "../../../../config";
import { TransactionModel } from "../../../../models/transaction.model";
import { ElrondProxyService } from "../../../../services/elrond-communication/elrond-proxy.service";
import { Address, AddressValue, TypedValue } from "@elrondnetwork/erdjs/out";
import { UserEnergyGetterService } from "./user.energy.getter.service";

@Injectable()
export class UserEnergyService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly userEnergyGetter: UserEnergyGetterService,
    ) {
    }

    async updateFarmsEnergyForUser(userAddress: string): Promise<TransactionModel | null> {
        const addresses = await this.getUserEnergyOutdatedAddresses(userAddress);
        if (addresses.length === 0) {
            return null
        }
        const endpointArgs: TypedValue[] = [];
        for (const address of addresses) {
            endpointArgs.push(new AddressValue(Address.fromString(address)));
        }
        const contract = await this.elrondProxy.getEnergyUpdateContract();
        return contract.methodsExplicit
            .updateFarmsEnergyForUser(endpointArgs)
            .withGasLimit(gasConfig.energyUpdate.updateFarmsEnergyForUser)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async getUserEnergyOutdatedAddresses(userAddress: string): Promise<string[]> {
        return await this.userEnergyGetter.getUserEnergyOutdatedAddresses(userAddress);
    }
}
