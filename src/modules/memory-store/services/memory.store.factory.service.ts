import { Injectable } from '@nestjs/common';
import { IMemoryStoreService } from './interfaces';

@Injectable()
export class MemoryStoreFactoryService {
    private queryMapping: Record<string, IMemoryStoreService<any, any>> = {};

    isReady(): boolean {
        // TODO: replace with actual checks on compatible memory store services
        return false;
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
