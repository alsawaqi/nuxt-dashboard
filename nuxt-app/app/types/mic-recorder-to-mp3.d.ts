// types/mic-recorder-to-mp3.d.ts
declare module 'mic-recorder-to-mp3' {
  interface MicRecorderOptions {
    bitRate?: number;
    encoderPath?: string;
    sampleRate?: number;
  }

  class MicRecorder {
    constructor(options?: MicRecorderOptions);

    start(): Promise<void>;

    stop(): {
      getMp3(): Promise<[Uint8Array[], Blob]>;
    };
  }

  export default MicRecorder;
}
