import { ISimpleLockAbiService } from '../services/interfaces';
import { SimpleLockAbiService } from '../services/simple.lock.abi.service';

export class SimpleLockAbiServiceMock implements ISimpleLockAbiService {
    async lockedTokenID(): Promise<string> {
        return 'LKESDT-1234';
    }

    async lpProxyTokenID(): Promise<string> {
        return 'LKPL-abcd';
    }

    async farmProxyTokenID(): Promise<string> {
        return 'LKFARM-abcd';
    }

    async intermediatedPairs(): Promise<string[]> {
        throw new Error('Method not implemented.');
    }

    async intermediatedFarms(): Promise<string[]> {
        throw new Error('Method not implemented.');
    }
}

export const SimpleLockAbiServiceProvider = {
    provide: SimpleLockAbiService,
    useClass: SimpleLockAbiServiceMock,
};
