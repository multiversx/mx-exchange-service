import { Logger } from '@nestjs/common';
import async_hooks from 'async_hooks';
import { randomUUID } from 'crypto';
import { PerformanceProfiler } from './performance.profiler';

export class CpuProfiler {
  private static readonly asyncHookDict: Record<number, { requestId: string, timestamp: number }> = {};
  private static readonly profilerDict: Record<string, { duration: number }> = {};
  private static hook?: async_hooks.AsyncHook;
  private readonly contextId = randomUUID();
  private readonly logger = new Logger(CpuProfiler.name);
  private readonly performanceProfiler = new PerformanceProfiler();

  constructor() {
    this.start();
  }

  private start() {
    CpuProfiler.ensureIsProfiling();

    CpuProfiler.profilerDict[this.contextId] = {
      duration: 0,
    };

    const asyncId = async_hooks.executionAsyncId();
    CpuProfiler.asyncHookDict[asyncId] = {
      requestId: this.contextId,
      timestamp: 0,
    };
  }

  stop(description?: string): number {
    this.performanceProfiler.stop();

    const duration = CpuProfiler.profilerDict[this.contextId]?.duration;

    delete CpuProfiler.profilerDict[this.contextId];

    if (description) {
      this.logger.log(`${description}: ${this.performanceProfiler.duration.toFixed(3)}ms, CPU time ${duration.toFixed(3)}ms`);
    }

    return duration;
  }

  static enable() {
    CpuProfiler.ensureIsProfiling().enable();
  }

  static disable() {
    CpuProfiler.ensureIsProfiling().disable();
  }

  private static ensureIsProfiling(): async_hooks.AsyncHook {
    if (!CpuProfiler.hook) {
      CpuProfiler.hook = async_hooks.createHook({ init: onInit, destroy: onDestroy, before: onBefore, after: onAfter }).enable();
    }

    return CpuProfiler.hook;

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    function onInit(asyncId: number, _: string, triggerAsyncId: number) {
      const previousValue = CpuProfiler.asyncHookDict[triggerAsyncId];
      if (previousValue) {
        CpuProfiler.asyncHookDict[asyncId] = {
          requestId: previousValue.requestId,
          timestamp: 0,
        };
      }
    }

    function onDestroy(asyncId: number) {
      const value = CpuProfiler.asyncHookDict[asyncId];
      if (value) {
        delete CpuProfiler.asyncHookDict[asyncId];
      }

    }

    function onBefore(asyncId: number) {
      const value = CpuProfiler.asyncHookDict[asyncId];
      if (value) {
        value.timestamp = CpuProfiler.now();
      }
    }

    function onAfter(asyncId: number) {
      const asyncHookItem = CpuProfiler.asyncHookDict[asyncId];
      if (asyncHookItem) {
        const requestId = asyncHookItem.requestId;
        const requestItem = CpuProfiler.profilerDict[requestId];
        if (requestItem && asyncHookItem.timestamp > 0) {
          CpuProfiler.profilerDict[requestId].duration += CpuProfiler.now() - asyncHookItem.timestamp;
        }

        delete CpuProfiler.asyncHookDict[asyncId];
      }
    }
  }

  private static now() {
    const hrTime = process.hrtime();
    return hrTime[0] * 1000 + hrTime[1] / 1000000;
  }
}
