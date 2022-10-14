import { Interaction, TypedValue } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { Logger } from 'winston';

@Injectable()
export class SimpleLockAbiService extends GenericAbiService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(elrondProxy, logger);
    }

    async getLockedTokenID(simpleLockAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getSimpleLockSmartContract(
            simpleLockAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLockedTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getLpProxyTokenID(simpleLockAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getSimpleLockSmartContract(
            simpleLockAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getLpProxyTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getFarmProxyTokenID(simpleLockAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getSimpleLockSmartContract(
            simpleLockAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getFarmProxyTokenId();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async getKnownLiquidityPools(simpleLockAddress: string): Promise<string[]> {
        const contract = await this.elrondProxy.getSimpleLockSmartContract(
            simpleLockAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getKnownLiquidityPools();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().map((pairAddress: TypedValue) => {
            return pairAddress.valueOf().toString();
        });
    }

    async getKnownFarms(simpleLockAddress: string): Promise<string[]> {
        const contract = await this.elrondProxy.getSimpleLockSmartContract(
            simpleLockAddress,
        );
        const interaction: Interaction =
            contract.methodsExplicit.getKnownFarms();

        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().map((farmAddress: TypedValue) => {
            return farmAddress.valueOf().toString();
        });
    }
}
