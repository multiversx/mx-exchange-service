import { Injectable } from "@nestjs/common";
import { elrondConfig, gasConfig } from "../../../../config";
import { TransactionModel } from "../../../../models/transaction.model";
import { ElrondProxyService } from "../../../../services/elrond-communication/elrond-proxy.service";
import { Address, AddressValue, TypedValue } from "@elrondnetwork/erdjs/out";
import { UserEnergyGetterService } from "./user.energy.getter.service";
import { OutdatedContract } from "../../models/user.model";

@Injectable()
export class UserEnergyService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly userEnergyGetter: UserEnergyGetterService,
    ) {
    }

    async updateFarmsEnergyForUser(userAddress: string): Promise<TransactionModel | null> {
        const outdatedContracts = await this.getUserOutdatedContracts(userAddress);
        if (outdatedContracts.length === 0) {
            return null
        }
        const endpointArgs: TypedValue[] = [];
        for (const contract of outdatedContracts) {
            if (!contract.claimProgressOutdated) {
                endpointArgs.push(new AddressValue(Address.fromString(contract.address)));
            }
        }
        const contract = await this.elrondProxy.getEnergyUpdateContract();
        return contract.methodsExplicit
            .updateFarmsEnergyForUser(endpointArgs)
            .withGasLimit(gasConfig.energyUpdate.updateFarmsEnergyForUser)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async getUserOutdatedContracts(userAddress: string): Promise<OutdatedContract[]> {
        return await this.userEnergyGetter.getUserOutdatedContracts(userAddress);
    }
}
