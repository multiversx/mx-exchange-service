import { Injectable } from '@nestjs/common';
import { PairMemoryStoreService } from './pair.memory.store.service';

@Injectable()
export class MemoryStoreFactoryService {
    constructor(private readonly pairMemoryStore: PairMemoryStoreService) {}
}
