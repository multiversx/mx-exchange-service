import { ISimpleLockAbiService } from '../services/interfaces';
import { SimpleLockAbiService } from '../services/simple.lock.abi.service';

export class SimpleLockAbiServiceMock implements ISimpleLockAbiService {
    async lockedTokenID(simpleLockAddress: string): Promise<string> {
        return 'LKESDT-1234';
    }

    async lpProxyTokenID(simpleLockAddress: string): Promise<string> {
        return 'LKPL-abcd';
    }

    async farmProxyTokenID(simpleLockAddress: string): Promise<string> {
        return 'LKFARM-abcd';
    }

    async intermediatedPairs(simpleLockAddress: string): Promise<string[]> {
        throw new Error('Method not implemented.');
    }

    async intermediatedFarms(simpleLockAddress: string): Promise<string[]> {
        throw new Error('Method not implemented.');
    }
}

export const SimpleLockAbiServiceProvider = {
    provide: SimpleLockAbiService,
    useClass: SimpleLockAbiServiceMock,
};
