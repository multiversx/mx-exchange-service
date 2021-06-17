import { Inject } from '@nestjs/common';
import { Query, Args, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import {
    UserModel,
    UserNFTTokenModel,
    UserTokenModel,
} from '../../models/user.model';
import { UserService } from './user.service';

@Resolver(of => UserModel)
export class UserResolver {
    constructor(@Inject(UserService) private userService: UserService) {}

    @ResolveField(returns => [UserTokenModel])
    async tokens(@Parent() user: UserModel): Promise<UserTokenModel[]> {
        return await this.userService.getAllEsdtTokens(user.address);
    }

    @ResolveField(returns => [UserNFTTokenModel])
    async nfts(@Parent() user: UserModel): Promise<UserNFTTokenModel[]> {
        return await this.userService.getAllNFTTokens(user.address);
    }

    @Query(returns => UserModel)
    async user(@Args('address') userAddress: string): Promise<UserModel> {
        return await this.userService.getUser(userAddress);
    }
}
