import { Injectable } from '@nestjs/common';
import { PairMemoryStoreService } from './pair.memory.store.service';
import { IMemoryStoreService } from './interfaces';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PairsResponse } from 'src/modules/pair/models/pairs.response';
import { TokenMemoryStoreService } from './token.memory.store.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { TokensResponse } from 'src/modules/tokens/models/tokens.response';

@Injectable()
export class MemoryStoreFactoryService {
    constructor(
        private readonly pairMemoryStore: PairMemoryStoreService,
        private readonly tokenMemoryStore: TokenMemoryStoreService,
    ) {
        const pairQueries = Object.keys(
            this.pairMemoryStore.getTargetedQueries(),
        );
        const tokenQueries = Object.keys(
            this.tokenMemoryStore.getTargetedQueries(),
        );

        for (const query of pairQueries) {
            this.queryMapping[query] = this
                .pairMemoryStore as IMemoryStoreService<
                PairModel[],
                PairsResponse
            >;
        }
        for (const query of tokenQueries) {
            this.queryMapping[query] = this
                .tokenMemoryStore as IMemoryStoreService<
                EsdtToken[],
                TokensResponse
            >;
        }
    }

    private queryMapping: Record<string, IMemoryStoreService<any, any>> = {};

    isReady(): boolean {
        return (
            this.pairMemoryStore.isReady() && this.tokenMemoryStore.isReady()
        );
    }

    getTargetedQueryNames(): string[] {
        return Object.keys(this.queryMapping);
    }

    useService(queryName: string): IMemoryStoreService<any, any> {
        return this.queryMapping[queryName];
    }
}
