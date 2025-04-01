import { IsInt } from 'class-validator';
import { IsValidUnixTime } from 'src/helpers/validators/unix.time.validator';

export class SnapshotDto {
    @IsValidUnixTime()
    @IsInt()
    timestamp: number;
}
