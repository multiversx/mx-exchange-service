import { Injectable } from '@nestjs/common';
import { DecodeAttributesModel } from '../../proxy/models/proxy.args';
import { WrappedLockedTokenAttributes } from '@multiversx/sdk-exchange';
import { WrappedLockedTokenAttributesModel } from '../../simple-lock/models/simple.lock.model';

@Injectable()
export class LockedTokenWrapperService {
    decodeWrappedLockedTokenAttributes(
        args: DecodeAttributesModel,
    ): WrappedLockedTokenAttributesModel {
        return new WrappedLockedTokenAttributesModel({
            ...WrappedLockedTokenAttributes.fromAttributes(
                args.attributes,
            ).toJSON(),
            attributes: args.attributes,
            identifier: args.identifier,
        });
    }
}
