import {
    Address,
    AddressValue,
    Interaction,
    SmartContract,
    U32Value,
} from '@multiversx/sdk-core';
import { GenericAbiService } from '../../../services/generics/generic.abi.service';
import BigNumber from 'bignumber.js';
import { ClaimProgress } from '../models/weekly-rewards-splitting.model';
import { Inject, Injectable } from '@nestjs/common';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import {
    ErrorGetContractHandlerNotSet,
    VmQueryError,
} from '../../../utils/errors.constants';
import { Energy, EnergyType } from '@multiversx/sdk-exchange';
import { ReturnCode } from '@multiversx/sdk-core/out/smartcontracts/returnCode';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class WeeklyRewardsSplittingAbiService extends GenericAbiService {
    constructor(
        protected readonly mxProxy: MXProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(mxProxy, logger);
    }
    async currentClaimProgress(
        scAddress: string,
        user: string,
    ): Promise<ClaimProgress> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getCurrentClaimProgress([
                new AddressValue(Address.fromString(user)),
            ]);
        const response = await this.getGenericData(interaction);
        if (
            (response.returnCode.equals(ReturnCode.UserError) &&
                response.returnMessage === VmQueryError.INPUT_TOO_SHORT) ||
            response.firstValue === null
        ) {
            return {
                energy: {
                    amount: '0',
                    lastUpdateEpoch: 0,
                    totalLockedTokens: '0',
                },
                week: 0,
            };
        }
        const energy = response.firstValue.valueOf().energy;
        const week = response.firstValue.valueOf().week.toNumber();
        return new ClaimProgress({
            energy: Energy.fromDecodedAttributes(energy).toJSON(),
            week,
        });
    }

    async userEnergyForWeek(
        scAddress: string,
        user: string,
        week: number,
        endEpochForWeek: number,
    ): Promise<EnergyType> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getUserEnergyForWeek([
                new AddressValue(Address.fromString(user)),
                new U32Value(new BigNumber(week)),
            ]);
        const response = await this.getGenericData(interaction);
        if (
            (response.returnCode.equals(ReturnCode.UserError) &&
                response.returnMessage === VmQueryError.INPUT_TOO_SHORT) ||
            !response.firstValue ||
            !response.firstValue.valueOf()
        ) {
            const claimProgress = await this.currentClaimProgress(
                scAddress,
                user,
            );
            if (claimProgress.week === 0) {
                return {
                    amount: '0',
                    lastUpdateEpoch: 0,
                    totalLockedTokens: '0',
                };
            }
            if (endEpochForWeek > claimProgress.energy.lastUpdateEpoch) {
                claimProgress.energy.amount = new BigNumber(
                    claimProgress.energy.amount,
                )
                    .minus(
                        new BigNumber(
                            claimProgress.energy.totalLockedTokens,
                        ).multipliedBy(
                            endEpochForWeek -
                                claimProgress.energy.lastUpdateEpoch,
                        ),
                    )
                    .toFixed();
                claimProgress.energy.lastUpdateEpoch = endEpochForWeek;
            }

            return claimProgress.energy;
        }
        return Energy.fromDecodedAttributes(
            response.firstValue.valueOf(),
        ).toJSON();
    }

    async lastActiveWeekForUser(
        scAddress: string,
        user: string,
    ): Promise<number> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getLastActiveWeekForUser([
                new AddressValue(Address.fromString(user)),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async lastGlobalUpdateWeek(scAddress: string): Promise<number> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getLastGlobalUpdateWeek();
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toNumber();
    }

    async totalRewardsForWeek(
        scAddress: string,
        week: number,
    ): Promise<EsdtTokenPayment[]> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getTotalRewardsForWeek([
                new U32Value(new BigNumber(week)),
            ]);
        const response = await this.getGenericData(interaction);
        const rewards = response.firstValue.valueOf().map((raw) => {
            const nonce = raw.token_nonce.toNumber();
            const discriminant = nonce != 0 ? 3 : 1;
            return new EsdtTokenPayment({
                tokenType: discriminant,
                tokenID: raw.token_identifier.toString(),
                nonce: nonce,
                amount: raw.amount.toFixed(),
            });
        });
        return rewards;
    }

    async totalEnergyForWeek(scAddress: string, week: number): Promise<string> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getTotalEnergyForWeek([
                new U32Value(new BigNumber(week)),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    async totalLockedTokensForWeek(
        scAddress: string,
        week: number,
    ): Promise<string> {
        const contract = await this.getContractHandler(scAddress);
        const interaction: Interaction =
            contract.methodsExplicit.getTotalLockedTokensForWeek([
                new U32Value(new BigNumber(week)),
            ]);
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf().toFixed();
    }

    protected getContractHandler: (
        scAddress: string,
    ) => Promise<SmartContract> = (scAddress) => {
        throw ErrorGetContractHandlerNotSet();
    };
}
