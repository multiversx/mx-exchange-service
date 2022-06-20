import { ResolveField, Resolver } from '@nestjs/graphql';
import { EsdtToken, EsdtTokenType } from '../tokens/models/esdtToken.model';
import { TokensResolver } from '../tokens/token.resolver';
import { UserToken } from './models/user.model';

@Resolver(() => UserToken)
export class UserTokenResolver extends TokensResolver {
    @ResolveField(() => String)
    async type(parent: EsdtToken): Promise<string> {
        if (parent.type !== EsdtTokenType.FungibleLpToken) {
            return super.type(parent);
        }
        return parent.type;
    }
}
