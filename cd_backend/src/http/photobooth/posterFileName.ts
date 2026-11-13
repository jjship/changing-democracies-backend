// Kiosk-supplied names are interpolated into Bunny Storage paths: no separators, dots or escapes.
export const POSTER_FILE_NAME_PATTERN = '^[A-Za-z0-9_-]+\\.(png|jpe?g|webp)$';

const posterFileNameRegex = new RegExp(POSTER_FILE_NAME_PATTERN);

export const isPosterFileName = (value: string): boolean => posterFileNameRegex.test(value);
