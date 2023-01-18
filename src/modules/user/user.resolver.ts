import { UseGuards } from '@nestjs/common';
import { Query, Args, Resolver } from '@nestjs/graphql';
import { OutdatedContract, UserNftToken, UserToken } from './models/user.model';
import { UserNftTokens } from './models/nfttokens.union';
import { UserMetaEsdtService } from './services/user.metaEsdt.service';
import { PaginationArgs } from '../dex.model';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { EsdtTokenInput } from '../tokens/models/esdtTokenInput.model';
import { ApolloError } from 'apollo-server-express';
import { Address } from '@elrondnetwork/erdjs/out';
import { NftTokenInput } from '../tokens/models/nftTokenInput.model';
import { UserEsdtService } from './services/user.esdt.service';
import { UserEnergyService } from './services/userEnergy/user.energy.service';
import { TransactionModel } from '../../models/transaction.model';

@Resolver()
export class UserResolver {
    constructor(
        private readonly userEsdt: UserEsdtService,
        private readonly userMetaEsdt: UserMetaEsdtService,
        private readonly userEnergy: UserEnergyService,
    ) {}

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [UserToken])
    async userTokens(
        @AuthUser() user: UserAuthResult,
        @Args() pagination: PaginationArgs,
    ): Promise<UserToken[]> {
        return await this.userEsdt.getAllEsdtTokens(user.address, pagination);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [UserNftTokens])
    async nfts(
        @Args() pagination: PaginationArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<Array<typeof UserNftTokens>> {
        const nfts = await this.userMetaEsdt.getAllNftTokens(
            user.address,
            pagination,
        );
        return nfts.filter((nft) => nft !== undefined);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [OutdatedContract])
    async userOutdatedContracts(
        @AuthUser() user: UserAuthResult,
    ): Promise<OutdatedContract[]> {
        return await this.userEnergy.getUserOutdatedContracts(user.address);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel, { nullable: true })
    async updateEnergy(
        @AuthUser() user: UserAuthResult,
        @Args('includeAllContracts', { nullable: true })
        includeAllContracts: boolean,
    ): Promise<TransactionModel | null> {
        return await this.userEnergy.updateFarmsEnergyForUser(
            user.address,
            includeAllContracts,
        );
    }

    @Query(() => [UserToken])
    async userCustomTokens(
        @Args() pagination: PaginationArgs,
        @Args('tokens', { type: () => [EsdtTokenInput] })
        tokens: EsdtTokenInput[],
    ): Promise<UserToken[]> {
        try {
            return await this.userEsdt.getAllEsdtTokens(
                Address.Zero().bech32(),
                pagination,
                tokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => [UserNftTokens])
    async userCustomNftTokens(
        @Args() pagination: PaginationArgs,
        @Args('nfts', { type: () => [NftTokenInput] }) nfts: NftTokenInput[],
    ): Promise<UserNftToken[]> {
        try {
            return await this.userMetaEsdt.getAllNftTokens(
                Address.Zero().bech32(),
                pagination,
                nfts,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
