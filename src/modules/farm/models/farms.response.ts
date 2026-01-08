import { ObjectType } from '@nestjs/graphql';
import relayTypes from 'src/utils/relay.types';
import { FarmModel } from './farm.v2.model';

@ObjectType()
export class FarmsResponse extends relayTypes<FarmModel>(FarmModel) {}
