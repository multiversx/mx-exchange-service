import { ILockedTokenWrapperGetterService } from '../interfaces';
import { ErrorNotImplemented } from '../../../utils/errors.constants';

export class LockedTokenWrapperGetterHandlers implements ILockedTokenWrapperGetterService {
    getLockedTokenId:(address: string) => Promise<string>;
    getWrappedTokenId:(address: string) => Promise<string>;

    constructor(init?: Partial<LockedTokenWrapperGetterHandlers>) {
        Object.assign(this, init);
    }
}

export class LockedTokenWrapperGetterServiceMock implements ILockedTokenWrapperGetterService {
    handlers: LockedTokenWrapperGetterHandlers;


    getLockedTokenId(address: string): Promise<string> {
        if (this.handlers.getLockedTokenId !== undefined) {
            return this.handlers.getLockedTokenId(address);
        }
        ErrorNotImplemented()
    }

    getWrappedTokenId(address: string): Promise<string> {
        if (this.handlers.getWrappedTokenId !== undefined) {
            return this.handlers.getWrappedTokenId(address);
        }
        ErrorNotImplemented()
    }

    constructor(init: Partial<LockedTokenWrapperGetterServiceMock>) {
        this.handlers = new LockedTokenWrapperGetterHandlers(init);
    }
}
