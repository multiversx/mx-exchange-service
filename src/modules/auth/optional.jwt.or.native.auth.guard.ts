import { ExecutionContext, Injectable } from '@nestjs/common';
import { JwtOrNativeAuthGuard } from './jwt.or.native.auth.guard';

@Injectable()
export class OptionalJwtOrNativeAuthGuard extends JwtOrNativeAuthGuard {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        await super.canActivate(context);
        return true;
    }
}
