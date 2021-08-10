import { Resolver, Query, ResolveField, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import {
    AddLiquidityProxyArgs,
    AddLiquidityProxyBatchArgs,
    ReclaimTemporaryFundsProxyArgs,
    RemoveLiquidityProxyArgs,
    TokensTransferArgs,
} from './models/proxy-pair.args';
import {
    ClaimFarmRewardsProxyArgs,
    CompoundRewardsProxyArgs,
    EnterFarmProxyArgs,
    EnterFarmProxyBatchArgs,
    ExitFarmProxyArgs,
} from './models/proxy-farm.args';
import { ProxyPairService } from './proxy-pair/proxy-pair.service';
import {
    GenericEsdtAmountPair,
    ProxyModel,
    WrappedFarmTokenAttributesModel,
    WrappedLpTokenAttributesModel,
} from './models/proxy.model';
import { ProxyFarmService } from './proxy-farm/proxy-farm.service';
import { TransactionsProxyPairService } from './proxy-pair/proxy-pair-transactions.service';
import { TransactionsProxyFarmService } from './proxy-farm/proxy-farm-transactions.service';
import { ProxyService } from './proxy.service';
import { DecodeAttributesArgs } from './models/proxy.args';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import {
    TokensMergingArgs,
    DepositTokenArgs,
    SmartContractType,
} from '../token-merging/dto/token.merging.args';
import { TokenMergingTransactionsService } from '../token-merging/token.merging.transactions.service';
import { TokenMergingService } from '../token-merging/token.merging.service';

@Resolver(of => ProxyModel)
export class ProxyResolver {
    constructor(
        @Inject(ProxyService) private proxyService: ProxyService,
        @Inject(ProxyPairService) private proxyPairService: ProxyPairService,
        @Inject(ProxyFarmService)
        private proxyFarmService: ProxyFarmService,
        @Inject(TransactionsProxyPairService)
        private transactionsProxyPairService: TransactionsProxyPairService,
        @Inject(TransactionsProxyFarmService)
        private transactionsProxyFarmService: TransactionsProxyFarmService,
        @Inject(TokenMergingTransactionsService)
        private readonly mergeTokensTransactions: TokenMergingTransactionsService,
        @Inject(TokenMergingService)
        private readonly mergeTokensService: TokenMergingService,
    ) {}

    @ResolveField()
    async wrappedLpToken(): Promise<NftCollection> {
        return await this.proxyPairService.getwrappedLpToken();
    }

    @ResolveField()
    async wrappedFarmToken(): Promise<NftCollection> {
        return await this.proxyFarmService.getwrappedFarmToken();
    }

    @ResolveField()
    async assetToken(): Promise<EsdtToken> {
        return await this.proxyService.getAssetToken();
    }

    @ResolveField()
    async lockedAssetToken(): Promise<NftCollection> {
        return await this.proxyService.getlockedAssetToken();
    }

    @ResolveField()
    async intermediatedPairs(): Promise<string[]> {
        return await this.proxyPairService.getIntermediatedPairs();
    }

    @ResolveField()
    async intermediatedFarms(): Promise<string[]> {
        return await this.proxyFarmService.getIntermediatedFarms();
    }

    @ResolveField()
    async nftDepositMaxLen() {
        return await this.mergeTokensService.getNftDepositMaxLen({
            smartContractType: SmartContractType.PROXY_PAIR,
        });
    }

    @ResolveField(type => [String])
    async nftDepositAcceptedTokenIDs() {
        return await this.mergeTokensService.getNftDepositAcceptedTokenIDs({
            smartContractType: SmartContractType.PROXY_PAIR,
        });
    }

    @Query(returns => ProxyModel)
    async proxy(): Promise<ProxyModel> {
        return await this.proxyService.getProxyInfo();
    }

    @Query(returns => TransactionModel)
    async tokensTransferProxy(
        @Args() args: TokensTransferArgs,
    ): Promise<TransactionModel> {
        return await this.transactionsProxyPairService.esdtTransferProxy(args);
    }

    @Query(returns => [TransactionModel])
    async addLiquidityProxyBatch(
        @Args() args: AddLiquidityProxyBatchArgs,
    ): Promise<TransactionModel[]> {
        if (
            args.lockedLpTokenID &&
            args.lockedLpTokenNonce &&
            args.lockedLpTokenAmount
        ) {
            const depositTokenArgs: DepositTokenArgs = {
                smartContractType: SmartContractType.PROXY_PAIR,
                tokenID: args.lockedLpTokenID,
                tokenNonce: args.lockedLpTokenNonce,
                amount: args.lockedLpTokenAmount,
                sender: args.sender,
            };
            const [
                depositTokensTransaction,
                addLiquidityProxyBatchTransactions,
            ] = await Promise.all([
                this.mergeTokensTransactions.depositTokens(depositTokenArgs),
                this.transactionsProxyPairService.addLiquidityProxyBatch(args),
            ]);
            return [
                depositTokensTransaction,
                ...addLiquidityProxyBatchTransactions,
            ];
        } else {
            return this.transactionsProxyPairService.addLiquidityProxyBatch(
                args,
            );
        }
    }

    @Query(returns => TransactionModel)
    async addLiquidityProxy(
        @Args() args: AddLiquidityProxyArgs,
    ): Promise<TransactionModel> {
        return await this.transactionsProxyPairService.addLiquidityProxy(args);
    }

    @Query(returns => [GenericEsdtAmountPair])
    async getTemporaryFundsProxy(
        @Args('userAddress') userAddress: string,
    ): Promise<GenericEsdtAmountPair[]> {
        return this.proxyPairService.getTemporaryFundsProxy(userAddress);
    }

    @Query(returns => [TransactionModel])
    async reclaimTemporaryFundsProxy(
        @Args() args: ReclaimTemporaryFundsProxyArgs,
    ): Promise<TransactionModel[]> {
        return await this.transactionsProxyPairService.reclaimTemporaryFundsProxy(
            args,
        );
    }

    @Query(returns => [TransactionModel])
    async removeLiquidityProxy(
        @Args() args: RemoveLiquidityProxyArgs,
    ): Promise<TransactionModel[]> {
        return await this.transactionsProxyPairService.removeLiquidityProxy(
            args,
        );
    }

    @Query(returns => TransactionModel)
    async enterFarmProxy(
        @Args() args: EnterFarmProxyArgs,
    ): Promise<TransactionModel> {
        return await this.transactionsProxyFarmService.enterFarmProxy(args);
    }

    @Query(returns => [TransactionModel])
    async enterFarmProxyBatch(
        @Args() args: EnterFarmProxyBatchArgs,
    ): Promise<TransactionModel[]> {
        const depositTokenArgs: DepositTokenArgs = {
            smartContractType: SmartContractType.PROXY_FARM,
            tokenID: args.lockedFarmTokenID,
            tokenNonce: args.lockedFarmTokenNonce,
            amount: args.lockedFarmAmount,
            sender: args.sender,
        };
        const enterFarmProxyArgs: EnterFarmProxyArgs = {
            sender: args.sender,
            acceptedLockedTokenID: args.acceptedLockedTokenID,
            acceptedLockedTokenNonce: args.acceptedLockedTokenNonce,
            farmAddress: args.farmAddress,
            amount: args.amount,
            lockRewards: args.lockRewards,
        };
        return await Promise.all([
            this.mergeTokensTransactions.depositTokens(depositTokenArgs),
            this.transactionsProxyFarmService.enterFarmProxy(
                enterFarmProxyArgs,
            ),
        ]);
    }

    @Query(returns => TransactionModel)
    async exitFarmProxy(
        @Args() args: ExitFarmProxyArgs,
    ): Promise<TransactionModel> {
        return await this.transactionsProxyFarmService.exitFarmProxy(args);
    }

    @Query(returns => TransactionModel)
    async claimFarmRewardsProxy(
        @Args() args: ClaimFarmRewardsProxyArgs,
    ): Promise<TransactionModel> {
        return await this.transactionsProxyFarmService.claimFarmRewardsProxy(
            args,
        );
    }

    @Query(returns => TransactionModel)
    async mergeWrappedLpTokens(
        @Args() args: TokensMergingArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.mergeTokens(args);
    }

    @Query(returns => TransactionModel)
    async mergeWrappedFarmTokens(
        @Args() args: TokensMergingArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.mergeTokens(args);
    }

    @Query(returns => TransactionModel)
    async compoundRewardsProxy(
        @Args() args: CompoundRewardsProxyArgs,
    ): Promise<TransactionModel> {
        return await this.transactionsProxyFarmService.compoundRewardsProxy(
            args,
        );
    }

    @Query(returns => [WrappedLpTokenAttributesModel])
    async wrappedLpTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<WrappedLpTokenAttributesModel[]> {
        return this.proxyService.getWrappedLpTokenAttributes(args);
    }

    @Query(returns => [WrappedFarmTokenAttributesModel])
    async wrappedFarmTokenAttributes(
        @Args('args')
        args: DecodeAttributesArgs,
    ): Promise<WrappedFarmTokenAttributesModel[]> {
        return await this.proxyService.getWrappedFarmTokenAttributes(args);
    }
}
