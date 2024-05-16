import { FarmAbiFactory } from '../farm.abi.factory';
import { FarmAbiServiceMock } from './farm.abi.service.mock';

export class FarmAbiFactoryMock {
    constructor(private readonly abiService: FarmAbiServiceMock) {}

    useAbi(_farmAddress: string): FarmAbiServiceMock {
        return this.abiService;
    }
}

export const FarmAbiFactoryServiceProvider = {
    provide: FarmAbiFactory,
    useClass: FarmAbiServiceMock,
};
