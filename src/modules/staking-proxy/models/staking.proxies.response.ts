import { ObjectType } from '@nestjs/graphql';
import relayTypes from 'src/utils/relay.types';
import { StakingProxyModel } from './staking.proxy.model';

@ObjectType()
export class StakingProxiesResponse extends relayTypes<StakingProxyModel>(
    StakingProxyModel,
) {}
