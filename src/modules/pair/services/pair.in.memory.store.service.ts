import { Injectable } from '@nestjs/common';
import { PairModel } from '../models/pair.model';
import {
    GlobalStateInitStatus,
    GlobalState,
} from 'src/modules/in-memory-store/global.state';

@Injectable()
export class PairInMemoryStoreService {
    isReady(): boolean {
        return GlobalState.initStatus === GlobalStateInitStatus.DONE;
    }

    getData(): PairModel[] {
        return GlobalState.getPairsArray();
    }
}
