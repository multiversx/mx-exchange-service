import { ObjectType } from '@nestjs/graphql';
import relayTypes from 'src/utils/relay.types';
import { EsdtToken } from './esdtToken.model';

@ObjectType()
export class TokensResponse extends relayTypes<EsdtToken>(EsdtToken) {}
