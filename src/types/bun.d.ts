// types/bun.d.ts
declare module 'bun' {
    export function cron(schedule: string, handler: () => void | Promise<void>): void;
  }
  