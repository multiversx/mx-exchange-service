import { Inject, Injectable } from '@nestjs/common';
import { GenericAbiService } from '../../../services/generics/generic.abi.service';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Interaction, SmartContract, TokenIdentifierValue, U32Value } from '@elrondnetwork/erdjs/out';
import {
    WeeklyRewardsSplittingAbiService,
} from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { Mixin } from 'ts-mixer';
import BigNumber from 'bignumber.js';
import { WeekTimekeepingAbiService } from '../../../submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import {
    ElrondApiService
} from '../../../services/elrond-communication/elrond-api.service';

@Injectable()
export class FeesCollectorAbiService extends Mixin(GenericAbiService, WeeklyRewardsSplittingAbiService, WeekTimekeepingAbiService) {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly apiService: ElrondApiService,
    ) {
        super(elrondProxy, logger);
        this.getContractHandler = this.getContract
    }

    async getContract(scAddress: string): Promise<SmartContract> {
        const contract = await this.elrondProxy.getFeesCollectorContract(scAddress)
        return contract
    }

    async accumulatedFees(scAddress: string, week: number, token: string): Promise<string> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getAccumulatedFees(
            [
                new U32Value(new BigNumber(week)),
                new TokenIdentifierValue(token),
            ],
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toString();
    }

    async accumulatedLockedFees(scAddress: string, week: number, token: string): Promise<EsdtTokenPayment[]> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getAccumulatedLockedFees(
            [
                new U32Value(new BigNumber(week)),
                new TokenIdentifierValue(token),
            ],
        );
        const response = await this.getGenericData(interaction);
        const rewards = response.firstValue.valueOf().map( raw => {
            const nonce = raw.token_nonce.toNumber()
            const discriminant = nonce != 0 ? 3 : 1;
            return new EsdtTokenPayment({
                tokenType: discriminant,
                tokenID: raw.token_identifier.toString(),
                nonce: nonce,
                amount: raw.amount.toFixed()
            });
        })
        return rewards;
    }

    async allTokens(scAddress: string): Promise<string[]> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getAllTokens();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }
}
