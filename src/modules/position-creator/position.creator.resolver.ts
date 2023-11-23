import { Query, Resolver } from '@nestjs/graphql';
import { PositionCreatorModel } from './models/position.creator.model';
import { scAddress } from 'src/config';

@Resolver(PositionCreatorModel)
export class PositionCreatorResolver {
    @Query(() => PositionCreatorModel)
    async getPositionCreator(): Promise<PositionCreatorModel> {
        return new PositionCreatorModel({
            address: scAddress.positionCreator,
        });
    }
}
