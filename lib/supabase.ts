import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// SecureStore values may have platform-specific size limits. Store longer
// Supabase session values in small chunks and write the manifest last.
const CHUNK_PREFIX = '__qratt_secure_chunks_v1__:';
const CHUNK_SIZE = 1000;

function chunkCount(value: string | null): number {
  if (!value?.startsWith(CHUNK_PREFIX)) return 0;
  const count = Number(value.slice(CHUNK_PREFIX.length));
  return Number.isInteger(count) && count > 0 ? count : 0;
}

const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const storedValue = await SecureStore.getItemAsync(key);
    const count = chunkCount(storedValue);
    if (count === 0) return storedValue;

    const chunks: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const chunk = await SecureStore.getItemAsync(`${key}.chunk.${index}`);
      if (chunk === null) return null;
      chunks.push(chunk);
    }
    return chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const previousValue = await SecureStore.getItemAsync(key);
    const previousCount = chunkCount(previousValue);

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      for (let index = 0; index < previousCount; index += 1) {
        await SecureStore.deleteItemAsync(`${key}.chunk.${index}`);
      }
      return;
    }

    const chunks: string[] = [];
    for (let offset = 0; offset < value.length; offset += CHUNK_SIZE) {
      chunks.push(value.slice(offset, offset + CHUNK_SIZE));
    }

    for (let index = 0; index < chunks.length; index += 1) {
      await SecureStore.setItemAsync(`${key}.chunk.${index}`, chunks[index]);
    }

    // Publish the chunk count only after all chunks are safely stored.
    await SecureStore.setItemAsync(key, `${CHUNK_PREFIX}${chunks.length}`);

    for (let index = chunks.length; index < previousCount; index += 1) {
      await SecureStore.deleteItemAsync(`${key}.chunk.${index}`);
    }
  },

  async removeItem(key: string): Promise<void> {
    const previousValue = await SecureStore.getItemAsync(key);
    const previousCount = chunkCount(previousValue);
    await SecureStore.deleteItemAsync(key);
    for (let index = 0; index < previousCount; index += 1) {
      await SecureStore.deleteItemAsync(`${key}.chunk.${index}`);
    }
  },
};

// Expo web uses browser storage; native Android/iOS use SecureStore.
const webStorage = {
  async getItem(key: string): Promise<string | null> {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? webStorage : secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
