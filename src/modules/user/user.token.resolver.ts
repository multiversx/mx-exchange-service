import { Resolver } from '@nestjs/graphql';
import { TokensResolver } from '../tokens/token.resolver';
import { UserToken } from './models/user.model';

@Resolver(() => UserToken)
export class UserTokenResolver extends TokensResolver {}
