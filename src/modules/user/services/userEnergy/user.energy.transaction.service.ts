import { Address, AddressValue, TypedValue } from '@multiversx/sdk-core/out';
import { Injectable } from '@nestjs/common';
import { gasConfig, mxConfig, scAddress } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { UserEnergyComputeService } from './user.energy.compute.service';

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
            new AddressValue(Address.fromString(userAddress)),
        ];

        if (includeAllContracts) {
            const farms = await this.userEnergyCompute.userActiveFarmsV2(
                userAddress,
            );
            farms.forEach((farm) => {
                endpointArgs.push(new AddressValue(Address.fromString(farm)));
            });
            if (!skipFeesCollector) {
                endpointArgs.push(
                    new AddressValue(
                        Address.fromString(scAddress.feesCollector),
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
