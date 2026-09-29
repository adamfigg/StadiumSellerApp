import { promises as fs } from "fs";
import path from "path";
import { uploadPath } from "@/lib/db";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** Serves card photos saved by createWant. Swap for S3/R2/Vercel Blob later. */
export async function GET(_req: Request, ctx: RouteContext<"/api/uploads/[file]">) {
  const { file } = await ctx.params;
  const name = path.basename(file);
  const type = TYPES[path.extname(name)];
  if (!type || name !== file) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(uploadPath(name));
    return new Response(data, {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
