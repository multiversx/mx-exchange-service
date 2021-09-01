import { ObjectType } from '@nestjs/graphql';
import { AddLiquidityEvent } from './addLiquidity.event';

@ObjectType()
export class RemoveLiquidityEvent extends AddLiquidityEvent {}
