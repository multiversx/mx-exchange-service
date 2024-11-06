import { tracer } from 'dd-trace';
import { envload } from './config/env_load';

envload();

if (process.env.ENABLE_TRACER === 'true') {
    tracer.init({
        logInjection: true,
        env: process.env.NODE_ENV,
        profiling: true,
        service: 'xechange-graph',
    });

    tracer.use('http', {
        server: {
            blocklist: ['/metrics'],
        },
    });

    tracer.use('graphql', {
        enabled: true,
        depth: -1,
    });
}

export default tracer;
