import { EnumType, EnumVariantDefinition } from '@multiversx/sdk-core/out';
import { Field, ObjectType } from '@nestjs/graphql';

export enum ComposableTaskType {
    WRAP_EGLD = 'WrapEGLD',
    UNWRAP_EGLD = 'UnwrapEGLD',
    SWAP = 'Swap',
    ROUTER_SWAP = 'RouterSwap',
    SEND_EGLD_OR_ESDT = 'SendEgldOrEsdt',
}

export class ComposableTaskEnumType {
    static getEnumType(): EnumType {
        return new EnumType('ComposableTaskType', [
            new EnumVariantDefinition('WrapEGLD', 0),
            new EnumVariantDefinition('UnwrapEGLD', 1),
            new EnumVariantDefinition('Swap', 2),
            new EnumVariantDefinition('RouterSwap', 3),
            new EnumVariantDefinition('SendEgldOrEsdt', 4),
        ]);
    }
}

@ObjectType()
export class ComposableTaskModel {
    @Field()
    address: string;

    constructor(init: Partial<ComposableTaskModel>) {
        Object.assign(this, init);
    }
}
