import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DecodeAttributesModel {
    @Field() identifier: string;
    @Field() attributes: string;
}

@InputType()
export class DecodeAttributesArgs {
    @Field(() => [DecodeAttributesModel])
    batchAttributes: Array<{
        identifier: string;
        attributes: string;
    }>;
}
