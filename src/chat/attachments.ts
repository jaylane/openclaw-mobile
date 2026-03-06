/**
 * Image and file attachment handling.
 */

import * as ImagePicker from 'expo-image-picker';
import { MessageAttachment } from './types';
import * as FileSystem from 'expo-file-system';

// Note: expo-image-picker is not in package.json yet but is a standard Expo dep
// Handled via expo-camera for camera snap; image picker for gallery

export async function pickImageFromLibrary(): Promise<MessageAttachment | null> {
  const result = await (ImagePicker as any).launchImageLibraryAsync({
    mediaTypes: (ImagePicker as any).MediaTypeOptions?.Images ?? 'images',
    allowsEditing: false,
    quality: 0.8,
    base64: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0]!;
  return {
    id: `img-${Date.now()}`,
    type: 'image',
    uri: asset.uri,
    name: asset.fileName ?? `image-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? 'image/jpeg',
    size: asset.fileSize,
  };
}

export async function fileToBase64(uri: string): Promise<string> {
  // expo-file-system is available via expo
  const fs = (FileSystem as any);
  if (fs?.readAsStringAsync) {
    return fs.readAsStringAsync(uri, { encoding: 'base64' });
  }
  // Fallback: fetch and convert
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
