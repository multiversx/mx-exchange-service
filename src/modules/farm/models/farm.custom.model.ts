import { Field, ObjectType } from '@nestjs/graphql';
import { BaseFarmModel } from './farm.model';

@ObjectType()
export class FarmCustomModel extends BaseFarmModel {
    @Field()
    requireWhitelist: boolean;
}
