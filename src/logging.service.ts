import { Injectable } from '@nestjs/common';

@Injectable()
export class LoggingService {
  constructor() {
    this.overrideConsole();
  }

  private overrideConsole() {
    const originalLog = console.log;
    const originalError = console.error;

    console.log = new Proxy(originalLog, {
      apply: (target, thisArg, argArray) => {
        const { stack } = new Error();
        const callerInfo = this.getCallerInfo(stack);
        const timestamp = new Date().toLocaleString()?.replace(', ', ' ');
        argArray.unshift(`🟢[${timestamp}][${callerInfo.function}]:`);
        return Reflect.apply(target, thisArg, argArray);
      },
    });

    console.error = new Proxy(originalError, {
      apply: (target, thisArg, argArray) => {
        const { stack } = new Error();
        const callerInfo = this.getCallerInfo(stack);
        const timestamp = new Date().toLocaleString()?.replace(', ', ' ');
        argArray.unshift(`🔴[${timestamp}][${callerInfo.function}]:`);
        return Reflect.apply(target, thisArg, argArray);
      },
    });

    console.info = new Proxy(originalError, {
      apply: (target, thisArg, argArray) => {
        const { stack } = new Error();
        const callerInfo = this.getCallerInfo(stack);
        const timestamp = new Date().toLocaleString()?.replace(', ', ' ');
        argArray.unshift(`🟡[${timestamp}][${callerInfo.function}]:`);
        return Reflect.apply(target, thisArg, argArray);
      },
    });
  }

  private getCallerInfo(stack: string) {
    const stackLines = stack.split('\n');
    const callerLine = stackLines[2]; // Зазвичай це третій рядок
    const match = callerLine.match(/at (.+) \((.+):(\d+):(\d+)\)/);

    if (match) {
      const functionName = match[1].trim() || 'unknownFunction';
      return {
        function: functionName,
      };
    }

    return {
      service: 'unknownService',
      function: 'unknownFunction',
    };
  }
}
