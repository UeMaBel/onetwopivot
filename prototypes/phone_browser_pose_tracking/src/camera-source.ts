export type CameraPermission = "unknown" | "granted" | "denied";

export interface CameraSource {
  readonly permission: CameraPermission;
  start(): Promise<MediaStream>;
  stop(): void;
}

export class BrowserCameraSource implements CameraSource {
  private stream: MediaStream | undefined;
  permission: CameraPermission = "unknown";

  async start(): Promise<MediaStream> {
    this.stop();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      this.permission = "granted";
      return this.stream;
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError")
        this.permission = "denied";
      throw error;
    }
  }

  stop(): void {
    if (!this.stream) return;
    for (const track of this.stream.getTracks()) track.stop();
    this.stream = undefined;
  }
}
