import { FarmGetterServiceV1_3 } from '../v1.3/services/farm.v1.3.getter.service';
import { FarmGetterServiceMock } from './farm.getter.service.mock';

export class FarmV13GetterServiceMock extends FarmGetterServiceMock {}

export const FarmV13GetterServiceProvider = {
    provide: FarmGetterServiceV1_3,
    useClass: FarmV13GetterServiceMock,
};
