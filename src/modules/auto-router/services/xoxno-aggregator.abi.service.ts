import { Tuple, U64Value, VariadicValue } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { scAddress } from 'src/config';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';

export type XoxnoReferrerBalance = {
    tokenID: string;
    amount: string;
};

export type XoxnoReferralConfig = {
    owner: string;
    fee: number;
    active: boolean;
};

@Injectable()
export class XoxnoAggregatorAbiService extends GenericAbiService {
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    // Undefined when the referral ID was never registered
    async referralConfig(
        referralID: number,
    ): Promise<XoxnoReferralConfig | undefined> {
        const abi = await this.mxProxy.getXoxnoAggregatorAbi();
        const endpointName = 'getReferralConfig';
        const queryResponse = await this.runQuery(
            scAddress.xoxnoAggregator,
            endpointName,
            [new U64Value(new BigNumber(referralID))],
        );

        const [rawConfig] = queryResponse.returnDataParts;
        if (!rawConfig || rawConfig.length === 0) {
            return undefined;
        }

        const response = this.parseQueryResponse(
            queryResponse,
            abi.getEndpoint(endpointName),
        );
        const config = response.firstValue.valueOf();

        return {
            owner: config.owner.toBech32(),
            fee: config.fee.toNumber(),
            active: config.active,
        };
    }

    // Uncached: callers act on the balances on-chain
    async referrerBalances(
        referralID: number,
    ): Promise<XoxnoReferrerBalance[]> {
        const abi = await this.mxProxy.getXoxnoAggregatorAbi();
        const response = await this.getGenericData(
            abi,
            scAddress.xoxnoAggregator,
            'getReferrerBalances',
            [new U64Value(new BigNumber(referralID))],
        );

        const balances = response.firstValue as VariadicValue | undefined;
        if (!balances) {
            return [];
        }

        return balances.getItems().map((item) => {
            const [token, amount] = (item as Tuple).getFields();
            return {
                tokenID: token.value.valueOf(),
                amount: amount.value.valueOf().toFixed(),
            };
        });
    }
}
