import { Injectable } from '@nestjs/common';
import { IMemoryStoreService } from './interfaces';
import { PairMemoryStoreService } from './pair.memory.store.service';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PairsResponse } from 'src/modules/pair/models/pairs.response';

@Injectable()
export class MemoryStoreFactoryService {
    private queryMapping: Record<string, IMemoryStoreService<any, any>> = {};

    constructor(private readonly pairMemoryStore: PairMemoryStoreService) {
        const pairQueries = Object.keys(
            this.pairMemoryStore.getTargetedQueries(),
        );

        for (const query of pairQueries) {
            this.queryMapping[query] = this
                .pairMemoryStore as IMemoryStoreService<
                PairModel[],
                PairsResponse
            >;
        }
    }

    isReady(): boolean {
        return this.pairMemoryStore.isReady();
    }

    getTargetedQueryNames(): string[] {
        return Object.keys(this.queryMapping);
    }

    useService(queryName: string): IMemoryStoreService<any, any> {
        if (!this.queryMapping[queryName]) {
            throw new Error(`Query ${queryName} cannot be resolved from store`);
        }
        return this.queryMapping[queryName];
    }
}
