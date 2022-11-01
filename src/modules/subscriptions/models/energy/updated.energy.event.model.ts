import { Field, ObjectType } from '@nestjs/graphql';
import { EnergyModel } from 'src/modules/energy/models/energy.model';

@ObjectType()
export class UpdatedEnergyEventModel {
    @Field(() => EnergyModel)
    oldEnergyEntry: EnergyModel;
    @Field(() => EnergyModel)
    newEnergyEntry: EnergyModel;

    constructor(init?: Partial<UpdatedEnergyEventModel>) {
        Object.assign(this, init);
    }
}
