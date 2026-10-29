/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { buildServiceUrl, isValidHttpUrl } from '../src/domain/url-builder';

describe('url-builder.test', () => {
  it('authuser_encoded', () => {
    // 1. URL standar Google tanpa query param
    const url1 = buildServiceUrl('https://aistudio.google.com', true, 'budi@gmail.com');
    expect(url1).toBe('https://aistudio.google.com/?authuser=budi%40gmail.com');

    // 2. Email dengan karakter khusus '+' (harus di-encode menjadi %2B)
    const url2 = buildServiceUrl('https://aistudio.google.com', true, 'eko+dev@gmail.com');
    expect(url2).toBe('https://aistudio.google.com/?authuser=eko%2Bdev%40gmail.com');

    // 3. URL yang sudah memiliki query parameter lain (disambung dengan '&')
    const url3 = buildServiceUrl('https://aistudio.google.com/prompts/new_chat?model=gemini', true, 'andi@gmail.com');
    expect(url3).toContain('model=gemini');
    expect(url3).toContain('authuser=andi%40gmail.com');
    expect(url3).toBe('https://aistudio.google.com/prompts/new_chat?model=gemini&authuser=andi%40gmail.com');

    // 4. URL yang sudah memiliki authuser lama (harus diperbarui)
    const urlWithOldAuth = 'https://aistudio.google.com/?authuser=old%40gmail.com&tab=recent';
    const url4 = buildServiceUrl(urlWithOldAuth, true, 'new@gmail.com');
    expect(url4).toContain('authuser=new%40gmail.com');
    expect(url4).not.toContain('old%40gmail.com');
  });

  it('non_google_plain', () => {
    // 1. Layanan non-Google (usesAuthuser: false) mengembalikan URL apa adanya
    const claudeUrl = buildServiceUrl('https://claude.ai', false, 'budi@gmail.com');
    expect(claudeUrl).toBe('https://claude.ai');
    expect(claudeUrl).not.toContain('authuser');

    const chatGptUrl = buildServiceUrl('https://chatgpt.com', false, 'budi@gmail.com');
    expect(chatGptUrl).toBe('https://chatgpt.com');
    expect(chatGptUrl).not.toContain('authuser');

    const deepseekUrl = buildServiceUrl('https://chat.deepseek.com', false, 'budi@gmail.com');
    expect(deepseekUrl).toBe('https://chat.deepseek.com');

    const xUrl = buildServiceUrl('https://x.com', false, 'budi@gmail.com');
    expect(xUrl).toBe('https://x.com');

    // 2. Email kosong atau null pada usesAuthuser: true tetap mengembalikan URL bersih
    const googleNoEmail = buildServiceUrl('https://aistudio.google.com', true, '');
    expect(googleNoEmail).toBe('https://aistudio.google.com');

    const googleNullEmail = buildServiceUrl('https://aistudio.google.com', true, null);
    expect(googleNullEmail).toBe('https://aistudio.google.com');
  });

  it('validates_http_schemes', () => {
    expect(isValidHttpUrl('https://aistudio.google.com')).toBe(true);
    expect(isValidHttpUrl('http://localhost:3000')).toBe(true);
    expect(isValidHttpUrl('ftp://example.com')).toBe(false);
    expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isValidHttpUrl('data:text/html,test')).toBe(false);
    expect(isValidHttpUrl('aistudio.google.com')).toBe(false); // tanpa skema
  });
});
