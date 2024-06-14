import { ObjectType } from '@nestjs/graphql';
import relayTypes from 'src/utils/relay.types';
import { StakingModel } from './staking.model';

@ObjectType()
export class StakingFarmsResponse extends relayTypes<StakingModel>(
    StakingModel,
) {}
