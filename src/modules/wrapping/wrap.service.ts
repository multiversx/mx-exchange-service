import { Injectable } from '@nestjs/common';
import { scAddress } from '../../config';
import { CacheWrapService } from '../../services/cache-manager/cache-wrapping.service';
import { ContextService } from '../../services/context/context.service';
import { EsdtToken } from '../../models/tokens/esdtToken.model';
import { WrapModel } from '../../models/wrapping.model';
import { AbiWrapService } from './abi-wrap.service';

@Injectable()
export class WrapService {
    constructor(
        private abiService: AbiWrapService,
        private cacheService: CacheWrapService,
        private context: ContextService,
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

    async getWrappedEgldTokenID(): Promise<string> {
        const cachedData = await this.cacheService.getWrappedEgldTokenID();
        if (!!cachedData) {
            return cachedData.wrappedEgldTokenID;
        }
        const wrappedEgldTokenID = await this.abiService.getWrappedEgldTokenID();
        this.cacheService.setWrappedEgldTokenID({
            wrappedEgldTokenID: wrappedEgldTokenID,
        });
        return wrappedEgldTokenID;
    }

    async getWrappedEgldToken(): Promise<EsdtToken> {
        const wrappedEgldTokenID = await this.getWrappedEgldTokenID();
        return this.context.getTokenMetadata(wrappedEgldTokenID);
    }
}
