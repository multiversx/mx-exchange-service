import {
    Address,
    AddressValue,
    BigUIntValue,
    Interaction,
    U64Value,
} from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Energy } from 'src/modules/simple-lock-energy/models/simple.lock.energy.model';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { Logger } from 'winston';
import { SimpleLockType } from '../../models/simple.lock.model';
import { SimpleLockAbiService } from '../simple.lock.abi.service';

@Injectable()
export class EnergyAbiService extends SimpleLockAbiService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(elrondProxy, logger);
        this.lockType = SimpleLockType.ENERGY_TYPE;
    }

    async getBaseAssetTokenID(): Promise<string> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getBaseAssetTokenId();

        const response = await this.getGenericData(
            EnergyAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toString();
    }

    async getLockOptions(): Promise<number[]> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLockOptions();

        const response = await this.getGenericData(
            EnergyAbiService.name,
            interaction,
        );
        return response.firstValue
            .valueOf()
            .map((lockOption: BigNumber) => lockOption.toNumber());
    }

    async getEnergyEntryForUser(userAddress: string): Promise<Energy> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getEnergyEntryForUser([
                new AddressValue(Address.fromString(userAddress)),
            ]);

        const response = await this.getGenericData(
            EnergyAbiService.name,
            interaction,
        );
        const rawEnergy = response.firstValue.valueOf();
        return new Energy({
            amount: rawEnergy.amount.toFixed(),
            lastUpdateEpoch: rawEnergy.last_update_epoch.toNumber(),
            totalLockedTokens: rawEnergy.total_locked_tokens.toFixed(),
        });
    }

    async getEnergyAmountForUser(userAddress: string): Promise<string> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getEnergyAmountForUser([
                new AddressValue(Address.fromString(userAddress)),
            ]);

        const response = await this.getGenericData(
            EnergyAbiService.name,
            interaction,
        );
        return response.firstValue.valueOf().toFixed();
    }

    async getPenaltyAmount(
        tokenAmount: string,
        epochsToReduce: number,
    ): Promise<string> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();
        const interaction: Interaction =
            contract.methodsExplicit.getPenaltyAmount([
                new BigUIntValue(new BigNumber(tokenAmount)),
                new U64Value(new BigNumber(epochsToReduce)),
            ]);

        const response = await this.getGenericData(
            EnergyAbiService.name,
            interaction,
        );

        return response.firstValue.valueOf().toFixed();
    }

    async isPaused(): Promise<boolean> {
        const contract =
            await this.elrondProxy.getSimpleLockEnergySmartContract();
        const interaction = contract.methodsExplicit.isPaused();
        const response = await this.getGenericData(
            EnergyAbiService.name,
            interaction,
        );

        return response.firstValue.valueOf();
    }
}
