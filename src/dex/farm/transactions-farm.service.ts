import { TransactionModel } from '../models/transaction.model';
import { Injectable } from '@nestjs/common';
import {
    BigUIntValue,
    U32Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { Address, GasLimit } from '@elrondnetwork/erdjs';
import { gasConfig } from '../../config';
import { ContextService } from '../utils/context.service';
import { BigNumber } from 'bignumber.js';
import { AbiFarmService } from './abi-farm.service';
import {
    ClaimRewardsArgs,
    EnterFarmArgs,
    ExitFarmArgs,
    SftFarmInteractionArgs,
} from './dto/farm.args';

@Injectable()
export class TransactionsFarmService {
    constructor(
        private abiService: AbiFarmService,
        private context: ContextService,
    ) {}

    async enterFarm(args: EnterFarmArgs): Promise<TransactionModel> {
        const contract = await this.abiService.getContract(args.farmAddress);

        const method = args.lockRewards
            ? 'enterFarmAndLockRewards'
            : 'enterFarm';

        const transactionArgs = [
            BytesValue.fromUTF8(args.tokenInID),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromUTF8(method),
        ];

        return await this.context.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.enterFarm),
        );
    }

    async exitFarm(args: ExitFarmArgs): Promise<TransactionModel> {
        return await this.SftFarmInteraction(args, 'exitFarm');
    }

    async claimRewards(args: ClaimRewardsArgs): Promise<TransactionModel> {
        return await this.SftFarmInteraction(args, 'claimRewards');
    }

    private async SftFarmInteraction(
        args: SftFarmInteractionArgs,
        method: string,
    ): Promise<TransactionModel> {
        const contract = await this.abiService.getContract(args.farmAddress);

        const transactionArgs = [
            BytesValue.fromUTF8(args.farmTokenID),
            new U32Value(args.farmTokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
            BytesValue.fromUTF8(method),
        ];

        const transaction = await this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.exitFarm),
        );

        transaction.receiver = args.sender;

        return transaction;
    }
}
