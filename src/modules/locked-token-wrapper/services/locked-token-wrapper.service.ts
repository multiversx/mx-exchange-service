import { Injectable } from '@nestjs/common';
import { DecodeAttributesModel } from '../../proxy/models/proxy.args';
import {
    WrappedLockedTokenAttributes
} from '@elrondnetwork/erdjs-dex';
import {
    WrappedLockedTokenAttributesModel
} from '../../simple-lock/models/simple.lock.model';
import { LockedTokenWrapperModel } from '../models/locked-token-wrapper.model';


@Injectable()
export class LockedTokenWrapperService {

    decodeWrappedLockedTokenAttributes(
        args: DecodeAttributesModel,
    ): WrappedLockedTokenAttributesModel {
        return new WrappedLockedTokenAttributesModel({
            ...WrappedLockedTokenAttributes.fromAttributes(args.attributes).toJSON(),
            attributes: args.attributes,
            identifier: args.identifier,
        });
    }

    lockedTokenWrapper(address: string): LockedTokenWrapperModel {
        return new LockedTokenWrapperModel({
            address: address,
        });
    }
}
