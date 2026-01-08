// Type declarations for packages without TypeScript definitions

declare module '@sheehanmunim/react-native-ffmpeg' {
    export interface Session {
        getReturnCode(): Promise<ReturnCode>;
        getAllLogsAsString(): Promise<string>;
    }

    export interface Statistics {
        getTime(): number;
        getSize(): number;
        getBitrate(): number;
        getSpeed(): number;
        getVideoFrameNumber(): number;
        getVideoQuality(): number;
        getVideoFps(): number;
    }

    export class ReturnCode {
        static isSuccess(returnCode: ReturnCode): boolean;
        static isCancel(returnCode: ReturnCode): boolean;
    }

    export class FFmpegKit {
        static execute(command: string): Promise<Session>;
        static executeAsync(command: string, completeCallback?: (session: Session) => void): Promise<Session>;
        static cancel(): Promise<void>;
    }

    export class FFmpegKitConfig {
        static enableStatisticsCallback(callback: (stats: Statistics) => void): void;
        static disableStatisticsCallback(): void;
        static enableLogCallback(callback: (log: Log) => void): void;
        static setLogLevel(level: number): void;
    }

    export interface Log {
        getLevel(): number;
        getMessage(): string;
    }
}
