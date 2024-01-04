import { Query, Resolver } from '@nestjs/graphql';
import { ComposableTaskModel } from './models/composable.tasks.model';
import { scAddress } from 'src/config';

@Resolver()
export class ComposableTasksResolver {
    @Query(() => ComposableTaskModel)
    async composableTask(): Promise<ComposableTaskModel> {
        return new ComposableTaskModel({
            address: scAddress.composableTasks,
        });
    }
}
