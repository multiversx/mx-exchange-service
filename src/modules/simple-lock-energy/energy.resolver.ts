import { ResolveField, Resolver } from '@nestjs/graphql';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { SimpleLockEnergyModel } from './models/simple.lock.energy.model';
import { EnergyGetterService } from './services/energy.getter.service';

@Resolver(() => SimpleLockEnergyModel)
export class EnergyResolver extends GenericResolver {
    constructor(private readonly energyGetter: EnergyGetterService) {
        super();
    }

    @ResolveField()
    async lockedTokenID(): Promise<string> {
        return await this.genericFieldResover<string>(() =>
            this.energyGetter.getLockedTokenID(),
        );
    }

    @ResolveField()
    async baseAssetTokenID(): Promise<string> {
        return await this.genericFieldResover<string>(() =>
            this.energyGetter.getBaseAssetTokenID(),
        );
    }

    @ResolveField()
    async lockOptions(): Promise<number[]> {
        return await this.genericFieldResover<number[]>(() =>
            this.energyGetter.getLockOptions(),
        );
    }
}
