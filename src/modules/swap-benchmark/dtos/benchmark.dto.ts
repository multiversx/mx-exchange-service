import { AutoRouterArgs } from 'src/modules/auto-router/models/auto-router.args';
import { SnapshotDto } from './create.snapshot.dto';
import { IsNotEmptyObject } from 'class-validator';

export class BenchmarkDto extends SnapshotDto {
    @IsNotEmptyObject()
    args: AutoRouterArgs;
}
