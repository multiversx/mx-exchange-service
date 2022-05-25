import { ObjectType } from '@nestjs/graphql';
import { SwapFixedInputEventModel } from './swapFixedInput.event.model';

@ObjectType()
export class SwapFixedOutputEventModel extends SwapFixedInputEventModel {}
