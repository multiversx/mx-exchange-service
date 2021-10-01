import { ObjectType } from '@nestjs/graphql';
import { SwapFixedInputEvent } from './swapFixedInput.event';

@ObjectType()
export class SwapFixedOutputEvent extends SwapFixedInputEvent {}
