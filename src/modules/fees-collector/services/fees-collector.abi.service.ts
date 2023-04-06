import { Injectable } from '@nestjs/common';
import { GenericAbiService } from '../../../services/generics/generic.abi.service';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import {
    Interaction,
    TokenIdentifierValue,
    U32Value,
} from '@multiversx/sdk-core';
import BigNumber from 'bignumber.js';

@Injectable()
export class FeesCollectorAbiService extends GenericAbiService {
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    async accumulatedFees(week: number, token: string): Promise<string> {
        const contract = await this.mxProxy.getFeesCollectorContract();
        const interaction: Interaction =
            contract.methodsExplicit.getAccumulatedFees([
                new U32Value(new BigNumber(week)),
                new TokenIdentifierValue(token),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().integerValue().toFixed();
    }

    async lockedTokenId(): Promise<string> {
        const contract = await this.mxProxy.getFeesCollectorContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLockedTokenId();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }

    async lockedTokensPerBlock(): Promise<string> {
        const contract = await this.mxProxy.getFeesCollectorContract();
        const interaction: Interaction =
            contract.methodsExplicit.getLockedTokensPerBlock();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async allTokens(): Promise<string[]> {
        const contract = await this.mxProxy.getFeesCollectorContract();
        const interaction: Interaction =
            contract.methodsExplicit.getAllTokens();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }
}
