const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 512000; // 500KB

export function validatePhotoDataUrl(photo: unknown): { error?: string } {
  if (typeof photo !== 'string' || !photo.startsWith('data:image/')) {
    return { error: 'Invalid image format' };
  }
  const mimeMatch = photo.match(/^data:(image\/\w+);base64,/);
  if (!mimeMatch || !ALLOWED_MIMES.includes(mimeMatch[1])) {
    return { error: 'Only JPEG, PNG, and WebP images are allowed' };
  }
  const base64Part = photo.split(',')[1];
  if (!base64Part) return { error: 'Invalid image data' };
  const byteSize = (base64Part.length * 3) / 4;
  if (byteSize > MAX_BYTES) {
    return { error: 'Image must be under 500KB' };
  }
  return {};
}
