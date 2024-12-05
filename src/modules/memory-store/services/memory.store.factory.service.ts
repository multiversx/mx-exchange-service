import { Injectable } from '@nestjs/common';
import { PairMemoryStoreService } from './pair.memory.store.service';
import { IMemoryStoreService } from './interfaces';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PairsResponse } from 'src/modules/pair/models/pairs.response';

@Injectable()
export class MemoryStoreFactoryService {
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

    private queryMapping: Record<string, IMemoryStoreService<any, any>> = {};

    isReady(): boolean {
        return this.pairMemoryStore.isReady();
    }

    getTargetedQueryNames(): string[] {
        return Object.keys(this.queryMapping);
    }

    useService(queryName: string): IMemoryStoreService<any, any> {
        return this.queryMapping[queryName];
    }
}
