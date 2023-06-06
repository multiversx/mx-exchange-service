import { Injectable } from '@nestjs/common';
import { scAddress } from '../../../config';
import { WrapModel } from '../models/wrapping.model';
import { WrapAbiService } from './wrap.abi.service';
import { EsdtToken } from '../../tokens/models/esdtToken.model';
import { TokenGetterService } from '../../tokens/services/token.getter.service';

@Injectable()
export class WrapService {
    constructor(
        private wrapAbi: WrapAbiService,
        private readonly tokenGetter: TokenGetterService,
    ) {}

    async getWrappingInfo(): Promise<WrapModel[]> {
        return [
            new WrapModel({
                address: scAddress.wrappingAddress.get('shardID-0'),
                shard: 0,
            }),
            new WrapModel({
                address: scAddress.wrappingAddress.get('shardID-1'),
                shard: 1,
            }),
            new WrapModel({
                address: scAddress.wrappingAddress.get('shardID-2'),
                shard: 2,
            }),
        ];
    }

    async wrappedEgldToken(): Promise<EsdtToken> {
        const wrappedEgldTokenID = await this.wrapAbi.wrappedEgldTokenID();
        return this.tokenGetter.getTokenMetadata(wrappedEgldTokenID);
    }
}
