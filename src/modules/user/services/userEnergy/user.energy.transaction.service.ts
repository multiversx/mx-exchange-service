import { Address, AddressValue, TypedValue } from '@multiversx/sdk-core/out';
import { Injectable } from '@nestjs/common';
import { gasConfig, mxConfig, scAddress } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { UserEnergyGetterService } from './user.energy.getter.service';

@Injectable()
export class UserEnergyTransactionService {
    constructor(
        private readonly mxProxy: MXProxyService,
        private readonly userEnergyGetter: UserEnergyGetterService,
    ) {}

    async updateFarmsEnergyForUser(
        userAddress: string,
        includeAllContracts = false,
    ): Promise<TransactionModel | null> {
        const endpointArgs: TypedValue[] = [
            new AddressValue(Address.fromString(userAddress)),
        ];

        if (includeAllContracts) {
            const farms = await this.userEnergyGetter.getUserActiveFarmsV2(
                userAddress,
            );
            farms.forEach((farm) => {
                endpointArgs.push(new AddressValue(Address.fromString(farm)));
            });
            endpointArgs.push(
                new AddressValue(Address.fromString(scAddress.feesCollector)),
            );
        } else {
            const contracts =
                await this.userEnergyGetter.getUserOutdatedContracts(
                    userAddress,
                );
            contracts.forEach((contract) => {
                if (contract !== undefined && !contract.claimProgressOutdated) {
                    endpointArgs.push(
                        new AddressValue(Address.fromString(contract.address)),
                    );
                }
            });
        }
        if (endpointArgs.length === 1) {
            return null;
        }

        const contract = await this.mxProxy.getEnergyUpdateContract();
        return contract.methodsExplicit
            .updateFarmsEnergyForUser(endpointArgs)
            .withGasLimit(
                gasConfig.energyUpdate.updateFarmsEnergyForUser *
                    endpointArgs.length,
            )
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}
