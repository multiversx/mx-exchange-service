import { TransactionModel } from '../../models/transaction.model';
import { Injectable } from '@nestjs/common';
import {
    BigUIntValue,
    U32Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { Address, GasLimit } from '@elrondnetwork/erdjs';
import { gasConfig } from '../../config';
import { BigNumber } from 'bignumber.js';
import {
    ClaimRewardsArgs,
    CompoundRewardsArgs,
    EnterFarmArgs,
    ExitFarmArgs,
    SftFarmInteractionArgs,
} from './models/farm.args';
import { ContextService } from '../../services/context/context.service';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';

@Injectable()
export class TransactionsFarmService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly context: ContextService,
    ) {}

    async enterFarm(args: EnterFarmArgs): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );

        const method = args.lockRewards
            ? 'enterFarmAndLockRewards'
            : 'enterFarm';

        const transactionArgs = [
            BytesValue.fromUTF8(args.tokenInID),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromUTF8(method),
        ];

        return this.context.esdtTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.enterFarm),
        );
    }

    async exitFarm(args: ExitFarmArgs): Promise<TransactionModel> {
        return this.SftFarmInteraction(args, 'exitFarm');
    }

    async claimRewards(args: ClaimRewardsArgs): Promise<TransactionModel> {
        return this.SftFarmInteraction(args, 'claimRewards');
    }

    async compoundRewards(
        args: CompoundRewardsArgs,
    ): Promise<TransactionModel> {
        return this.SftFarmInteraction(args, 'compoundRewards');
    }

    private async SftFarmInteraction(
        args: SftFarmInteractionArgs,
        method: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );

        const transactionArgs = [
            BytesValue.fromUTF8(args.farmTokenID),
            new U32Value(args.farmTokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
            BytesValue.fromUTF8(method),
        ];

        const transaction = this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.exitFarm),
        );

        transaction.receiver = args.sender;

        return transaction;
    }
}
