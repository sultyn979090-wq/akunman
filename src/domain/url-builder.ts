/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Validasi apakah URL memiliki skema http atau https yang valid
 */
export function isValidHttpUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  // Harus diawali http:// atau https://
  if (!/^https?:\/\//i.test(trimmed)) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Membangun URL tujuan layanan:
 * - URL layanan tanpa skema http(s) ditolak dengan Error.
 * - Builder menghasilkan '...?authuser=<email>' (email di-encode) hanya bila usesAuthuser = true dan googleEmail tersedia.
 * - Jika URL sudah memiliki query params lain, disambung dengan '&authuser=...'.
 * - Jika URL sudah memiliki parameter 'authuser', nilainya diperbarui.
 * - Jika bukan layanan Google (usesAuthuser = false), mengembalikan URL apa adanya tanpa parameter authuser.
 */
export function buildServiceUrl(
  urlTemplate: string,
  usesAuthuser: boolean,
  googleEmail?: string | null
): string {
  const trimmed = urlTemplate ? urlTemplate.trim() : '';

  if (!isValidHttpUrl(trimmed)) {
    throw new Error(`URL layanan tidak valid: "${urlTemplate}". URL wajib menggunakan skema http:// atau https://.`);
  }

  // Jika tidak menggunakan authuser atau email tidak diberikan, kembalikan URL bersih
  if (!usesAuthuser || !googleEmail || !googleEmail.trim()) {
    return trimmed;
  }

  const encodedEmail = encodeURIComponent(googleEmail.trim());

  try {
    const parsed = new URL(trimmed);
    parsed.searchParams.set('authuser', googleEmail.trim());
    return parsed.toString();
  } catch {
    // Fallback parser manual jika URL parsing edge case
    const hashIndex = trimmed.indexOf('#');
    let base = hashIndex >= 0 ? trimmed.substring(0, hashIndex) : trimmed;
    const hash = hashIndex >= 0 ? trimmed.substring(hashIndex) : '';

    if (base.includes('?')) {
      // Periksa apakah sudah ada authuser=
      if (/([?&])authuser=[^&]*/i.test(base)) {
        base = base.replace(/([?&])authuser=[^&]*/i, `$1authuser=${encodedEmail}`);
      } else {
        base = `${base}&authuser=${encodedEmail}`;
      }
    } else {
      base = `${base}?authuser=${encodedEmail}`;
    }

    return `${base}${hash}`;
  }
}
