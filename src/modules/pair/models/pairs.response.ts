import { ObjectType } from '@nestjs/graphql';
import relayTypes from 'src/utils/relay.types';
import { PairModel } from './pair.model';

@ObjectType()
export class PairsResponse extends relayTypes<PairModel>(PairModel) {}
