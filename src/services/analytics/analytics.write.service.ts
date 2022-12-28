import { Injectable } from '@nestjs/common';
import { AnalyticsWriteInterface } from './analytics.write.interface';

@Injectable()
export class AnalyticsWriteService  implements AnalyticsWriteInterface{
}
