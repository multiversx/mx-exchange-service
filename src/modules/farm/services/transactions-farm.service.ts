import { TransactionModel } from '../../../models/transaction.model';
import { Inject, Injectable } from '@nestjs/common';
import {
    BigUIntValue,
    U32Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { Address, GasLimit } from '@elrondnetwork/erdjs';
import { gasConfig } from '../../../config';
import { BigNumber } from 'bignumber.js';
import {
    ClaimRewardsArgs,
    CompoundRewardsArgs,
    EnterFarmArgs,
    ExitFarmArgs,
    SftFarmInteractionArgs,
} from '../models/farm.args';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { FarmGetterService } from './farm.getter.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';

@Injectable()
export class TransactionsFarmService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly contextTransactions: ContextTransactionsService,
        private readonly farmGetterService: FarmGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async enterFarm(
        sender: string,
        args: EnterFarmArgs,
    ): Promise<TransactionModel> {
        try {
            await this.validateInputTokens(args.farmAddress, args.tokens);
        } catch (error) {
            const logMessage = generateLogMessage(
                TransactionsFarmService.name,
                this.enterFarm.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const contract = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );

        const method = args.lockRewards
            ? 'enterFarmAndLockRewards'
            : 'enterFarm';

        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            args.tokens,
            method,
            [],
            new GasLimit(
                args.tokens.length > 1
                    ? gasConfig.enterFarmMerge
                    : gasConfig.enterFarm,
            ),
        );
    }

    async exitFarm(
        sender: string,
        args: ExitFarmArgs,
    ): Promise<TransactionModel> {
        return this.SftFarmInteraction(
            sender,
            args,
            'exitFarm',
            gasConfig.exitFarm,
        );
    }

    async claimRewards(
        sender: string,
        args: ClaimRewardsArgs,
    ): Promise<TransactionModel> {
        return this.SftFarmInteraction(
            sender,
            args,
            'claimRewards',
            gasConfig.claimRewards,
        );
    }

    async compoundRewards(
        sender: string,
        args: CompoundRewardsArgs,
    ): Promise<TransactionModel> {
        return this.SftFarmInteraction(
            sender,
            args,
            'compoundRewards',
            gasConfig.compoundRewards,
        );
    }

    private async SftFarmInteraction(
        sender: string,
        args: SftFarmInteractionArgs,
        method: string,
        gasLimit: number,
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

        const transaction = this.contextTransactions.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasLimit),
        );

        transaction.receiver = sender;

        return transaction;
    }

    private async validateInputTokens(
        farmAddress: string,
        tokens: InputTokenModel[],
    ): Promise<void> {
        const [farmTokenID, farmingTokenID] = await Promise.all([
            this.farmGetterService.getFarmTokenID(farmAddress),
            this.farmGetterService.getFarmingTokenID(farmAddress),
        ]);

        if (tokens[0].tokenID !== farmingTokenID || tokens[0].nonce > 0) {
            throw new Error('invalid farming token provided');
        }

        for (const inputToken of tokens.slice(1)) {
            if (inputToken.tokenID !== farmTokenID || inputToken.nonce === 0) {
                throw new Error('invalid farm token provided');
            }
        }
    }
}
