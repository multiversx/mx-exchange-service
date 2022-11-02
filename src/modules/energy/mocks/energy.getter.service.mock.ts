import { EnergyGetterService } from '../services/energy.getter.service';

export class EnergyGetterServiceMock {
    async getLockedTokenID(): Promise<string> {
        return 'ELKMEX-123456';
    }
}

export const EnergyGetterServiceProvider = {
    provide: EnergyGetterService,
    useClass: EnergyGetterServiceMock,
};
