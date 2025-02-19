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
    EnergyPositionSingleTokenModel,
    FarmPositionSingleTokenModel,
    LiquidityPositionSingleTokenModel,
    StakingPositionSingleTokenModel,
} from './models/position.creator.model';
import { PositionCreatorComputeService } from './services/position.creator.compute';
import { FarmAbiServiceV2 } from '../farm/v2/services/farm.v2.abi.service';
import { StakingProxyAbiService } from '../staking-proxy/services/staking.proxy.abi.service';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { constantsConfig } from 'src/config';
import { StakingAbiService } from '../staking/services/staking.abi.service';
import { PairAbiService } from '../pair/services/pair.abi.service';

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
        const payment = new EsdtTokenPayment(parent.payment);

        const transactions =
            await this.posCreatorTransaction.createLiquidityPositionSingleToken(
                user.address,
                pairAddress,
                payment,
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
        private readonly pairAbi: PairAbiService,
    ) {}

    @ResolveField(() => [TransactionModel])
    @UseGuards(JwtOrNativeAuthGuard)
    async transactions(
        @AuthUser() user: UserAuthResult,
        @Parent() parent: FarmPositionSingleTokenModel,
        @Args('farmAddress') farmAddress: string,
        @Args('additionalPayments', {
            type: () => [InputTokenModel],
            defaultValue: [],
        })
        additionalPayments: InputTokenModel[],
        @Args('lockEpochs', { nullable: true }) lockEpochs: number,
    ): Promise<TransactionModel[]> {
        const pairAddress = await this.farmAbi.pairContractAddress(farmAddress);
        const lpTokenID = await this.pairAbi.lpTokenID(pairAddress);

        if (
            parent.payment.tokenIdentifier !== lpTokenID &&
            pairAddress !==
                parent.swaps[parent.swaps.length - 1].pairs[0].address
        ) {
            throw new GraphQLError('Invalid farm address', {
                extensions: {
                    code: ApolloServerErrorCode.BAD_USER_INPUT,
                },
            });
        }

        return this.posCreatorTransaction.createFarmPositionSingleToken(
            user.address,
            farmAddress,
            [
                new EsdtTokenPayment(parent.payment),
                ...additionalPayments.map(
                    (payment) =>
                        new EsdtTokenPayment({
                            tokenIdentifier: payment.tokenID,
                            tokenNonce: payment.nonce,
                            amount: payment.amount,
                        }),
                ),
            ],
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
        private readonly pairAbi: PairAbiService,
    ) {}

    @ResolveField(() => [TransactionModel])
    @UseGuards(JwtOrNativeAuthGuard)
    async transactions(
        @AuthUser() user: UserAuthResult,
        @Parent() parent: DualFarmPositionSingleTokenModel,
        @Args('dualFarmAddress') dualFarmAddress: string,
        @Args('additionalPayments', {
            type: () => [InputTokenModel],
            defaultValue: [],
        })
        additionalPayments: InputTokenModel[],
    ): Promise<TransactionModel[]> {
        const pairAddress = await this.stakingProxyAbi.pairAddress(
            dualFarmAddress,
        );
        const lpTokenID = await this.pairAbi.lpTokenID(pairAddress);

        if (
            parent.payment.tokenIdentifier !== lpTokenID &&
            pairAddress !==
                parent.swaps[parent.swaps.length - 1].pairs[0].address
        ) {
            throw new GraphQLError('Invalid farm address', {
                extensions: {
                    code: ApolloServerErrorCode.BAD_USER_INPUT,
                },
            });
        }

        return this.posCreatorTransaction.createDualFarmPositionSingleToken(
            user.address,
            dualFarmAddress,
            [
                new EsdtTokenPayment(parent.payment),
                ...additionalPayments.map(
                    (payment) =>
                        new EsdtTokenPayment({
                            tokenIdentifier: payment.tokenID,
                            tokenNonce: payment.nonce,
                            amount: payment.amount,
                        }),
                ),
            ],
            parent.swaps,
        );
    }
}

@Resolver(() => StakingPositionSingleTokenModel)
export class StakingPositionSingleTokenResolver {
    constructor(
        private readonly posCreatorTransaction: PositionCreatorTransactionService,
        private readonly stakingAbi: StakingAbiService,
    ) {}

    @ResolveField(() => [TransactionModel])
    @UseGuards(JwtOrNativeAuthGuard)
    async transactions(
        @AuthUser() user: UserAuthResult,
        @Parent() parent: StakingPositionSingleTokenModel,
        @Args('stakingAddress') stakingAddress: string,
        @Args('additionalPayments', {
            type: () => [InputTokenModel],
            defaultValue: [],
        })
        additionalPayments: InputTokenModel[],
    ): Promise<TransactionModel[]> {
        const farmingTokenID = await this.stakingAbi.farmingTokenID(
            stakingAddress,
        );
        if (
            farmingTokenID !== parent.swaps[parent.swaps.length - 1].tokenOutID
        ) {
            throw new GraphQLError('Invalid staking address', {
                extensions: {
                    code: ApolloServerErrorCode.BAD_USER_INPUT,
                },
            });
        }

        return this.posCreatorTransaction.createStakingPositionSingleToken(
            user.address,
            stakingAddress,
            parent.swaps[0],
            [
                new EsdtTokenPayment(parent.payment),
                ...additionalPayments.map(
                    (payment) =>
                        new EsdtTokenPayment({
                            tokenIdentifier: payment.tokenID,
                            tokenNonce: payment.nonce,
                            amount: payment.amount,
                        }),
                ),
            ],
        );
    }
}

@Resolver(() => EnergyPositionSingleTokenModel)
export class EnergyPositionSingleTokenResolver {
    constructor(
        private readonly posCreatorTransaction: PositionCreatorTransactionService,
    ) {}

    @ResolveField(() => [TransactionModel])
    @UseGuards(JwtOrNativeAuthGuard)
    async transactions(
        @AuthUser() user: UserAuthResult,
        @Parent() parent: EnergyPositionSingleTokenModel,
        @Args('lockEpochs') lockEpochs: number,
    ): Promise<TransactionModel[]> {
        return this.posCreatorTransaction.createEnergyPosition(
            user.address,
            new EsdtTokenPayment(parent.payment),
            parent.swaps[0],
            lockEpochs,
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
        const esdtTokenPayment = new EsdtTokenPayment({
            tokenIdentifier: payment.tokenID,
            tokenNonce: payment.nonce,
            amount: payment.amount,
        });
        const swapRoutes =
            await this.posCreatorCompute.computeSingleTokenPairInput(
                pairAddress,
                esdtTokenPayment,
                tolerance,
            );

        return new LiquidityPositionSingleTokenModel({
            payment: esdtTokenPayment,
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
        const esdtTokenPayment = new EsdtTokenPayment({
            tokenIdentifier: payment.tokenID,
            tokenNonce: payment.nonce,
            amount: payment.amount,
        });

        const swapRoutes =
            await this.posCreatorCompute.computeSingleTokenPairInput(
                pairAddress,
                esdtTokenPayment,
                tolerance,
            );

        return new FarmPositionSingleTokenModel({
            payment: esdtTokenPayment,
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
        const esdtTokenPayment = new EsdtTokenPayment({
            tokenIdentifier: payment.tokenID,
            tokenNonce: payment.nonce,
            amount: payment.amount,
        });

        const swapRoutes =
            await this.posCreatorCompute.computeSingleTokenPairInput(
                pairAddress,
                esdtTokenPayment,
                tolerance,
            );

        return new DualFarmPositionSingleTokenModel({
            payment: esdtTokenPayment,
            swaps: swapRoutes,
        });
    }

    @Query(() => StakingPositionSingleTokenModel)
    async createStakingPositionSingleToken(
        @Args('stakingAddress') stakingAddress: string,
        @Args('payment', { type: () => InputTokenModel })
        payment: InputTokenModel,
        @Args('tolerance') tolerance: number,
    ): Promise<StakingPositionSingleTokenModel> {
        return this.posCreatorCompute.computeStakingPositionSingleToken(
            stakingAddress,
            new EsdtTokenPayment({
                tokenIdentifier: payment.tokenID,
                tokenNonce: payment.nonce,
                amount: payment.amount,
            }),
            tolerance,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
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

    @UseGuards(JwtOrNativeAuthGuard)
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

    @UseGuards(JwtOrNativeAuthGuard)
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

    @Query(() => EnergyPositionSingleTokenModel)
    async createEnergyPosition(
        @Args('payment') payment: InputTokenModel,
        @Args('tolerance') tolerance: number,
    ): Promise<EnergyPositionSingleTokenModel> {
        const esdtTokenPayment = new EsdtTokenPayment({
            tokenIdentifier: payment.tokenID,
            tokenNonce: payment.nonce,
            amount: payment.amount,
        });

        const swapRoute = await this.posCreatorCompute.computeSingleTokenInput(
            esdtTokenPayment,
            constantsConfig.MEX_TOKEN_ID,
            tolerance,
        );

        return new EnergyPositionSingleTokenModel({
            payment: esdtTokenPayment,
            swaps: [swapRoute],
        });
    }
}
