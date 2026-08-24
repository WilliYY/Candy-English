declare module "sharp" {
  type SharpBackground = {
    alpha?: number;
    b: number;
    g: number;
    r: number;
  };

  type SharpInput =
    | Buffer
    | {
        create: {
          background: SharpBackground;
          channels: 3 | 4;
          height: number;
          width: number;
        };
      };

  interface SharpPipeline {
    metadata(): Promise<{
      format?: string;
      height?: number;
      width?: number;
    }>;
    png(): SharpPipeline;
    resize(
      width: number,
      height: number,
      options?: {
        fit?: "cover" | "contain" | "fill" | "inside" | "outside";
        position?: string;
        withoutEnlargement?: boolean;
      },
    ): SharpPipeline;
    rotate(): SharpPipeline;
    toBuffer(): Promise<Buffer>;
    webp(options?: { effort?: number; quality?: number }): SharpPipeline;
  }

  type Sharp = (
    input?: SharpInput,
    options?: {
      failOn?: "none" | "truncated" | "error" | "warning";
      limitInputPixels?: number;
    },
  ) => SharpPipeline;

  const sharp: Sharp;
  export default sharp;
}
