import { Address, AddressValue, TypedValue } from '@multiversx/sdk-core';
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

        if (includeAllContracts) {
            const farms = await this.userEnergyCompute.userActiveFarmsV2(
                userAddress,
            );
            farms.forEach((farm) => {
                endpointArgs.push(
                    new AddressValue(Address.newFromBech32(farm)),
                );
            });
            if (!skipFeesCollector) {
                endpointArgs.push(
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
                    endpointArgs.push(
                        new AddressValue(
                            Address.newFromBech32(contract.address),
                        ),
                    );
                }
            });
        }
        if (endpointArgs.length === 1) {
            return null;
        }

        return await this.mxProxy.getEnergyUpdateSmartContractTransaction(
            new TransactionOptions({
                sender: userAddress,
                gasLimit:
                    gasConfig.energyUpdate.updateFarmsEnergyForUser *
                    endpointArgs.length,
                function: 'updateFarmsEnergyForUser',
                arguments: endpointArgs,
            }),
        );
    }
}
