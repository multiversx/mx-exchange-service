import { ObjectType } from '@nestjs/graphql';
import { AddLiquidityEventModel } from './addLiquidity.event.model';

@ObjectType()
export class RemoveLiquidityEventModel extends AddLiquidityEventModel {}
