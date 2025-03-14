import {
    Address,
    AddressValue,
    TypedValue,
    VariadicValue,
} from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { gasConfig, scAddress } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { UserEnergyComputeService } from './user.energy.compute.service';
import { TransactionOptions } from 'src/modules/common/transaction.options';

@Injectable()
export class UserEnergyTransactionService {
    constructor(
        private readonly mxProxy: MXProxyService,
        private readonly userEnergyCompute: UserEnergyComputeService,
    ) {}

    async updateFarmsEnergyForUser(
        userAddress: string,
        includeAllContracts = false,
        skipFeesCollector = false,
    ): Promise<TransactionModel | null> {
        const endpointArgs: TypedValue[] = [
            new AddressValue(Address.newFromBech32(userAddress)),
        ];
        const farmAddresses: TypedValue[] = [];

        if (includeAllContracts) {
            const farms = await this.userEnergyCompute.userActiveFarmsV2(
                userAddress,
            );
            farms.forEach((farm) => {
                farmAddresses.push(
                    new AddressValue(Address.newFromBech32(farm)),
                );
            });
            if (!skipFeesCollector) {
                farmAddresses.push(
                    new AddressValue(
                        Address.newFromBech32(scAddress.feesCollector),
                    ),
                );
            }
        } else {
            const contracts =
                await this.userEnergyCompute.getUserOutdatedContracts(
                    userAddress,
                    skipFeesCollector,
                );
            contracts.forEach((contract) => {
                if (contract !== undefined && !contract.claimProgressOutdated) {
                    farmAddresses.push(
                        new AddressValue(
                            Address.newFromBech32(contract.address),
                        ),
                    );
                }
            });
        }

        if (farmAddresses.length === 0) {
            return null;
        }

        endpointArgs.push(VariadicValue.fromItems(...farmAddresses));

        return this.mxProxy.getEnergyUpdateSmartContractTransaction(
            new TransactionOptions({
                sender: userAddress,
                gasLimit:
                    gasConfig.energyUpdate.updateFarmsEnergyForUser *
                    farmAddresses.length,
                function: 'updateFarmsEnergyForUser',
                arguments: endpointArgs,
            }),
        );
    }
}
