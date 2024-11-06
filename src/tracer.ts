import { tracer } from 'dd-trace';
import { envload } from './config/env_load';

envload();

if (process.env.ENABLE_TRACER === 'true') {
    console.log('DD_TRACE_AGENT_HOSTNAME', process.env.DD_TRACE_AGENT_HOSTNAME);
    tracer.init({
        logInjection: true,
        env: process.env.NODE_ENV,
        profiling: true,
        service: 'xechange-graph',
        hostname: process.env.DD_TRACE_AGENT_HOSTNAME ?? 'localhost',
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
