import { Interaction, SmartContract } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { Logger } from 'winston';
import { SimpleLockType } from '../models/simple.lock.model';

@Injectable()
export class SimpleLockAbiService extends GenericAbiService {
    protected lockType: SimpleLockType;

    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(elrondProxy, logger);
        this.lockType = SimpleLockType.BASE_TYPE;
    }

    async getLockedTokenID(): Promise<string> {
        const contract = await this.getContract(this.lockType);
        const interaction: Interaction =
            contract.methodsExplicit.getLockedTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getLpProxyTokenID(): Promise<string> {
        const contract = await this.getContract(this.lockType);
        const interaction: Interaction =
            contract.methodsExplicit.getLpProxyTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getFarmProxyTokenID(): Promise<string> {
        const contract = await this.getContract(this.lockType);
        const interaction: Interaction =
            contract.methodsExplicit.getFarmProxyTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getKnownLiquidityPools(): Promise<string[]> {
        const contract = await this.getContract(this.lockType);
        const interaction: Interaction =
            contract.methodsExplicit.getKnownLiquidityPools();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().map((pairAddress) => {
            return pairAddress.valueOf().toString();
        });
    }

    async getKnownFarms(): Promise<string[]> {
        const contract = await this.getContract(this.lockType);
        const interaction: Interaction =
            contract.methodsExplicit.getKnownFarms();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().map((farmAddress) => {
            return farmAddress.valueOf().toString();
        });
    }

    private async getContract(
        simpleLockType: SimpleLockType,
    ): Promise<SmartContract> {
        switch (simpleLockType) {
            case SimpleLockType.BASE_TYPE:
                return await this.elrondProxy.getSimpleLockSmartContract();
            case SimpleLockType.ENERGY_TYPE:
                return await this.elrondProxy.getSimpleLockEnergySmartContract();
        }
    }
}
