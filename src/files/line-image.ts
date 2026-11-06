import sharp from 'sharp';

/** LINE image message limits (Messaging API). */
export const LINE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const LINE_PREVIEW_MAX_BYTES = 1024 * 1024;
const PREVIEW_SIZE = 240;

/**
 * Make an image LINE-compatible:
 * - original: JPEG/PNG under 10 MB (null = the stored file can be used as is)
 * - preview: small JPEG thumbnail (LINE requires < 1 MB)
 */
export async function prepareLineImage(
  input: Buffer,
  ext: string,
): Promise<{ original: Buffer | null; preview: Buffer }> {
  const usableAsIs =
    ['jpg', 'jpeg', 'png'].includes(ext) &&
    input.length <= LINE_IMAGE_MAX_BYTES;

  const original = usableAsIs
    ? null
    : await sharp(input)
        .rotate() // apply EXIF orientation
        .resize({
          width: 2048,
          height: 2048,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .flatten({ background: '#ffffff' }) // JPEG has no transparency
        .jpeg({ quality: 85 })
        .toBuffer();

  const preview = await sharp(input)
    .rotate()
    .resize({ width: PREVIEW_SIZE, height: PREVIEW_SIZE, fit: 'inside' })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 80 })
    .toBuffer();

  return { original, preview };
}
