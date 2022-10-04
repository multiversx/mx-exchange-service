import { FarmV13GetterService } from '../services/v1.3/farm.v1.3.getter.service';
import { FarmGetterServiceMock } from './farm.getter.service.mock';

export class FarmV13GetterServiceMock extends FarmGetterServiceMock {}

export const FarmV13GetterServiceProvider = {
    provide: FarmV13GetterService,
    useClass: FarmV13GetterServiceMock,
};
