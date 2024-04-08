import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { TransactionModel } from 'src/models/transaction.model';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { PositionCreatorTransactionService } from './services/position.creator.transaction';
import { InputTokenModel } from 'src/models/inputToken.model';
import { UserAuthResult } from '../auth/user.auth.result';
import { AuthUser } from '../auth/auth.user';
import {
    DualFarmPositionSingleTokenModel,
    FarmPositionSingleTokenModel,
    LiquidityPositionSingleTokenModel,
} from './models/position.creator.model';
import { PositionCreatorComputeService } from './services/position.creator.compute';
import { FarmAbiServiceV2 } from '../farm/v2/services/farm.v2.abi.service';
import { StakingProxyAbiService } from '../staking-proxy/services/staking.proxy.abi.service';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/dist/esm/errors';

@Resolver(() => LiquidityPositionSingleTokenModel)
export class LiquidityPositionSingleTokenResolver {
    constructor(
        private readonly posCreatorTransaction: PositionCreatorTransactionService,
    ) {}

    @ResolveField(() => [TransactionModel])
    @UseGuards(JwtOrNativeAuthGuard)
    async transactions(
        @AuthUser() user: UserAuthResult,
        @Parent() parent: LiquidityPositionSingleTokenModel,
        @Args('lockEpochs', { nullable: true }) lockEpochs: number,
    ): Promise<TransactionModel[]> {
        const pairAddress =
            parent.swaps[parent.swaps.length - 1].pairs[0].address;
        const payment = new EsdtTokenPayment({
            tokenIdentifier: parent.swaps[0].tokenInID,
            tokenNonce: 0,
            amount: parent.swaps[0].amountIn,
        });

        const transactions =
            await this.posCreatorTransaction.createLiquidityPositionSingleToken(
                user.address,
                pairAddress,
                payment,
                parent.swaps[parent.swaps.length - 1].tolerance,
                parent.swaps,
                lockEpochs,
            );

        return transactions;
    }
}

@Resolver(() => FarmPositionSingleTokenModel)
export class FarmPositionSingleTokenResolver {
    constructor(
        private readonly posCreatorTransaction: PositionCreatorTransactionService,
        private readonly farmAbi: FarmAbiServiceV2,
    ) {}

    @ResolveField(() => [TransactionModel])
    @UseGuards(JwtOrNativeAuthGuard)
    async transactions(
        @AuthUser() user: UserAuthResult,
        @Parent() parent: FarmPositionSingleTokenModel,
        @Args('farmAddress') farmAddress: string,
        @Args('additionalPayments', {
            type: () => [InputTokenModel],
            nullable: true,
        })
        additionalPayments: InputTokenModel[],
        @Args('lockEpochs', { nullable: true }) lockEpochs: number,
    ): Promise<TransactionModel[]> {
        const pairAddress = await this.farmAbi.pairContractAddress(farmAddress);

        if (
            pairAddress !==
            parent.swaps[parent.swaps.length - 1].pairs[0].address
        ) {
            throw new GraphQLError('Invalid farm address', {
                extensions: {
                    code: ApolloServerErrorCode.BAD_USER_INPUT,
                },
            });
        }

        const firstPayment = new EsdtTokenPayment({
            tokenIdentifier: parent.swaps[0].tokenInID,
            tokenNonce: 0,
            amount: parent.swaps[0].amountIn,
        });

        return this.posCreatorTransaction.createFarmPositionSingleToken(
            user.address,
            farmAddress,
            [
                firstPayment,
                ...additionalPayments.map(
                    (payment) =>
                        new EsdtTokenPayment({
                            tokenIdentifier: payment.tokenID,
                            tokenNonce: payment.nonce,
                            amount: payment.amount,
                        }),
                ),
            ],
            parent.swaps[length - 1].tolerance,
            parent.swaps,
            lockEpochs,
        );
    }
}

@Resolver(() => DualFarmPositionSingleTokenModel)
export class DualFarmPositionSingleTokenResolver {
    constructor(
        private readonly posCreatorTransaction: PositionCreatorTransactionService,
        private readonly stakingProxyAbi: StakingProxyAbiService,
    ) {}

    @ResolveField(() => [TransactionModel])
    @UseGuards(JwtOrNativeAuthGuard)
    async transactions(
        @AuthUser() user: UserAuthResult,
        @Parent() parent: DualFarmPositionSingleTokenModel,
        @Args('dualFarmAddress') dualFarmAddress: string,
        @Args('additionalPayments', {
            type: () => [InputTokenModel],
            nullable: true,
        })
        additionalPayments: InputTokenModel[],
    ): Promise<TransactionModel[]> {
        const pairAddress = await this.stakingProxyAbi.pairAddress(
            dualFarmAddress,
        );
        if (
            pairAddress !==
            parent.swaps[parent.swaps.length - 1].pairs[0].address
        ) {
            throw new GraphQLError('Invalid farm address', {
                extensions: {
                    code: ApolloServerErrorCode.BAD_USER_INPUT,
                },
            });
        }

        const firstPayment = new EsdtTokenPayment({
            tokenIdentifier: parent.swaps[0].tokenInID,
            tokenNonce: 0,
            amount: parent.swaps[0].amountIn,
        });

        return this.posCreatorTransaction.createDualFarmPositionSingleToken(
            user.address,
            dualFarmAddress,
            [
                firstPayment,
                ...additionalPayments.map(
                    (payment) =>
                        new EsdtTokenPayment({
                            tokenIdentifier: payment.tokenID,
                            tokenNonce: payment.nonce,
                            amount: payment.amount,
                        }),
                ),
            ],
            parent.swaps[length - 1].tolerance,
            parent.swaps,
        );
    }
}

@Resolver()
export class PositionCreatorTransactionResolver {
    constructor(
        private readonly posCreatorTransaction: PositionCreatorTransactionService,
        private readonly posCreatorCompute: PositionCreatorComputeService,
        private readonly farmAbi: FarmAbiServiceV2,
        private readonly stakingProxyAbi: StakingProxyAbiService,
    ) {}

    @Query(() => LiquidityPositionSingleTokenModel)
    async createPositionSingleToken(
        @Args('pairAddress') pairAddress: string,
        @Args('payment') payment: InputTokenModel,
        @Args('tolerance') tolerance: number,
    ): Promise<LiquidityPositionSingleTokenModel> {
        const swapRoutes =
            await this.posCreatorCompute.computeSingleTokenPairInput(
                pairAddress,
                new EsdtTokenPayment({
                    tokenIdentifier: payment.tokenID,
                    tokenNonce: payment.nonce,
                    amount: payment.amount,
                }),
                tolerance,
            );

        return new LiquidityPositionSingleTokenModel({
            swaps: swapRoutes,
        });
    }

    @Query(() => FarmPositionSingleTokenModel)
    async createFarmPositionSingleToken(
        @Args('farmAddress') farmAddress: string,
        @Args('payment') payment: InputTokenModel,
        @Args('tolerance') tolerance: number,
    ): Promise<FarmPositionSingleTokenModel> {
        const pairAddress = await this.farmAbi.pairContractAddress(farmAddress);

        const swapRoutes =
            await this.posCreatorCompute.computeSingleTokenPairInput(
                pairAddress,
                new EsdtTokenPayment({
                    tokenIdentifier: payment.tokenID,
                    tokenNonce: payment.nonce,
                    amount: payment.amount,
                }),
                tolerance,
            );

        return new FarmPositionSingleTokenModel({
            swaps: swapRoutes,
        });
    }

    @Query(() => DualFarmPositionSingleTokenModel)
    async createDualFarmPositionSingleToken(
        @Args('dualFarmAddress') dualFarmAddress: string,
        @Args('payment') payment: InputTokenModel,
        @Args('tolerance') tolerance: number,
    ): Promise<DualFarmPositionSingleTokenModel> {
        const pairAddress = await this.stakingProxyAbi.pairAddress(
            dualFarmAddress,
        );

        const swapRoutes =
            await this.posCreatorCompute.computeSingleTokenPairInput(
                pairAddress,
                new EsdtTokenPayment({
                    tokenIdentifier: payment.tokenID,
                    tokenNonce: payment.nonce,
                    amount: payment.amount,
                }),
                tolerance,
            );

        return new DualFarmPositionSingleTokenModel({
            swaps: swapRoutes,
        });
    }

    @Query(() => [TransactionModel])
    async createStakingPositionSingleToken(
        @AuthUser() user: UserAuthResult,
        @Args('stakingAddress') stakingAddress: string,
        @Args('payments', { type: () => [InputTokenModel] })
        payments: InputTokenModel[],
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel[]> {
        return this.posCreatorTransaction.createStakingPositionSingleToken(
            user.address,
            stakingAddress,
            payments.map(
                (payment) =>
                    new EsdtTokenPayment({
                        tokenIdentifier: payment.tokenID,
                        tokenNonce: payment.nonce,
                        amount: payment.amount,
                    }),
            ),
            tolerance,
        );
    }

    @Query(() => [TransactionModel])
    async createFarmPositionDualTokens(
        @AuthUser() user: UserAuthResult,
        @Args('farmAddress') farmAddress: string,
        @Args('payments', { type: () => [InputTokenModel] })
        payments: InputTokenModel[],
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel[]> {
        return this.posCreatorTransaction.createFarmPositionDualTokens(
            user.address,
            farmAddress,
            payments.map(
                (payment) =>
                    new EsdtTokenPayment({
                        tokenIdentifier: payment.tokenID,
                        tokenNonce: payment.nonce,
                        amount: payment.amount,
                    }),
            ),
            tolerance,
        );
    }

    @Query(() => [TransactionModel])
    async createDualFarmPositionDualTokens(
        @AuthUser() user: UserAuthResult,
        @Args('dualFarmAddress') dualFarmAddress: string,
        @Args('payments', { type: () => [InputTokenModel] })
        payments: InputTokenModel[],
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel[]> {
        return this.posCreatorTransaction.createDualFarmPositionDualTokens(
            user.address,
            dualFarmAddress,
            payments.map(
                (payment) =>
                    new EsdtTokenPayment({
                        tokenIdentifier: payment.tokenID,
                        tokenNonce: payment.nonce,
                        amount: payment.amount,
                    }),
            ),
            tolerance,
        );
    }

    @Query(() => TransactionModel)
    async exitFarmPositionDualTokens(
        @AuthUser() user: UserAuthResult,
        @Args('farmAddress') farmAddress: string,
        @Args('payment') payment: InputTokenModel,
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel> {
        return this.posCreatorTransaction.exitFarmPositionDualTokens(
            user.address,
            farmAddress,
            new EsdtTokenPayment({
                tokenIdentifier: payment.tokenID,
                tokenNonce: payment.nonce,
                amount: payment.amount,
            }),
            tolerance,
        );
    }

    @Query(() => TransactionModel)
    async createEnergyPosition(
        @AuthUser() user: UserAuthResult,
        @Args('payment') payment: InputTokenModel,
        @Args('lockEpochs') lockEpochs: number,
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel> {
        return this.posCreatorTransaction.createEnergyPosition(
            user.address,
            new EsdtTokenPayment({
                tokenIdentifier: payment.tokenID,
                tokenNonce: payment.nonce,
                amount: payment.amount,
            }),
            lockEpochs,
            tolerance,
        );
    }
}
