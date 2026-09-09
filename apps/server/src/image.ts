import sharp from "sharp";

// MiMo bills image tokens proportionally to actual pixel resolution, unlike
// DeepSeek/Groq which cap or flat-rate image cost regardless of size — so our
// shared high-resolution page renders (chosen for DeepSeek's accuracy) are
// disproportionately expensive there. Downscale before sending to MiMo only.
export async function resizeBase64PngToMaxDimension(
  base64: string,
  maxDimension: number
): Promise<string> {
  const buffer = Buffer.from(base64, "base64");
  const resized = await sharp(buffer)
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
  return resized.toString("base64");
}
