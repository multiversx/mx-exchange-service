import { Query, Resolver } from '@nestjs/graphql';
import { EnergyUpdateModel } from './models/energy.update.model';
import { scAddress } from 'src/config';

@Resolver(EnergyUpdateModel)
export class EnergyUpdateResolver {
    @Query(() => EnergyUpdateModel)
    async energyUpdate(): Promise<EnergyUpdateModel> {
        return new EnergyUpdateModel({
            address: scAddress.energyUpdate,
        });
    }
}
