import { Query, ResolveField, Resolver } from '@nestjs/graphql';
import { scAddress } from 'src/config';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { EscrowModel } from './models/escrow.model';
import { EscrowGetterService } from './services/escrow.getter.service';

@Resolver(EscrowModel)
export class EscrowResolver extends GenericResolver {
    constructor(private readonly escrowGetter: EscrowGetterService) {
        super();
    }

    @ResolveField()
    async energyFactoryAddress(): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.escrowGetter.getEnergyFactoryAddress(),
        );
    }

    @ResolveField()
    async lockedTokenID(): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.escrowGetter.getLockedTokenID(),
        );
    }

    @ResolveField()
    async minLockEpochs(): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.escrowGetter.getMinLockEpochs(),
        );
    }

    @ResolveField()
    async epochsCooldownDuration(): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.escrowGetter.getEpochCooldownDuration(),
        );
    }

    @Query(() => EscrowModel)
    async escrowContract(): Promise<EscrowModel> {
        return new EscrowModel({
            address: scAddress.escrow,
        });
    }
}
