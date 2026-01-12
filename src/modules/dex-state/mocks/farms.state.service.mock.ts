import { FarmsStateService } from '../services/farms.state.service';

export class FarmsStateServiceMock {}

export const FarmsStateServiceProvider = {
    provide: FarmsStateService,
    useClass: FarmsStateServiceMock,
};
