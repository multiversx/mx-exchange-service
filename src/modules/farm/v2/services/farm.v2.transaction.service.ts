import { Address, TokenTransfer } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { mxConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { farmType } from 'src/utils/farm.utils';
import { TransactionsFarmService } from '../../base-module/services/farm.transaction.service';
import {
    EnterFarmArgs,
    ExitFarmArgs,
    ClaimRewardsArgs,
    CompoundRewardsArgs,
} from '../../models/farm.args';
import { FarmRewardType, FarmVersion } from '../../models/farm.model';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { FarmAbiServiceV2 } from './farm.v2.abi.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';

@Injectable()
export class FarmTransactionServiceV2 extends TransactionsFarmService {
    constructor(
        protected readonly mxProxy: MXProxyService,
        protected readonly farmAbi: FarmAbiServiceV2,
        protected readonly pairService: PairService,
        protected readonly pairAbi: PairAbiService,
        private readonly mxApi: MXApiService,
        private readonly contextGetter: ContextGetterService,
    ) {
        super(mxProxy, farmAbi, pairService, pairAbi);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async enterFarm(
        sender: string,
        args: EnterFarmArgs,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFarmSmartContract(
            args.farmAddress,
        );

        const gasLimit =
            args.tokens.length > 1
                ? gasConfig.farms[FarmVersion.V2].enterFarm.withTokenMerge
                : gasConfig.farms[FarmVersion.V2].enterFarm.default;

        await this.validateInputTokens(args.farmAddress, args.tokens);

        const mappedPayments = args.tokens.map((tokenPayment) =>
            TokenTransfer.metaEsdtFromBigInteger(
                tokenPayment.tokenID,
                tokenPayment.nonce,
                new BigNumber(tokenPayment.amount),
            ),
        );

        return contract.methodsExplicit
            .enterFarm()
            .withMultiESDTNFTTransfer(mappedPayments)
            .withSender(Address.fromString(sender))
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async exitFarm(
        sender: string,
        args: ExitFarmArgs,
    ): Promise<TransactionModel> {
        if (!args.exitAmount && !new BigNumber(args.exitAmount).isPositive()) {
            throw new Error('Invalid exit amount');
        }
        const contract = await this.mxProxy.getFarmSmartContract(
            args.farmAddress,
        );
        const gasLimit = await this.getExitFarmGasLimit(
            args,
            FarmVersion.V2,
            farmType(args.farmAddress),
        );

        return contract.methodsExplicit
            .exitFarm()
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    args.farmTokenID,
                    args.farmTokenNonce,
                    new BigNumber(args.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
    async claimRewards(
        sender: string,
        args: ClaimRewardsArgs,
    ): Promise<TransactionModel> {
        const type = farmType(args.farmAddress);

        const lockedAssetCreateGas =
            type === FarmRewardType.LOCKED_REWARDS
                ? gasConfig.lockedAssetCreate
                : 0;
        const gasLimit =
            gasConfig.farms[FarmVersion.V2][type].claimRewards +
            lockedAssetCreateGas;

        const contract = await this.mxProxy.getFarmSmartContract(
            args.farmAddress,
        );

        return contract.methodsExplicit
            .claimRewards()
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    args.farmTokenID,
                    args.farmTokenNonce,
                    new BigNumber(args.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async claimBoostedRewards(
        sender: string,
        farmAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);

        return contract.methodsExplicit
            .claimBoostedRewards()
            .withSender(Address.fromString(sender))
            .withChainID(mxConfig.chainID)
            .withGasLimit(gasConfig.farms[FarmVersion.V2].claimBoostedRewards)
            .buildTransaction()
            .toPlainObject();
    }

    compoundRewards(
        sender: string,
        args: CompoundRewardsArgs,
    ): Promise<TransactionModel> {
        throw new Error('Method not implemented.');
    }

    async migrateTotalFarmPosition(
        farmAddress: string,
        userAddress: string,
    ): Promise<TransactionModel[]> {
        const [farmTokenID, migrationNonce, userNftsCount] = await Promise.all([
            this.farmAbi.farmTokenID(farmAddress),
            this.farmAbi.farmPositionMigrationNonce(farmAddress),
            this.mxApi.getNftsCountForUser(userAddress),
        ]);

        const userNfts = await this.contextGetter.getNftsForUser(
            userAddress,
            0,
            userNftsCount > 0 ? userNftsCount : 100,
            'MetaESDT',
            [farmTokenID],
        );

        const promises: Promise<TransactionModel>[] = [];
        userNfts.forEach((nft) => {
            if (nft.nonce < migrationNonce) {
                promises.push(
                    this.claimRewards(userAddress, {
                        farmAddress,
                        farmTokenID: nft.collection,
                        farmTokenNonce: nft.nonce,
                        amount: nft.balance,
                        lockRewards: true,
                    }),
                );
            }
        });

        return Promise.all(promises);
    }
}
