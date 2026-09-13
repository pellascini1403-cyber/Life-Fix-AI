import * as ImagePicker from 'expo-image-picker';

export type GalleryPickResult =
  | { status: 'picked'; uri: string }
  | { status: 'canceled' }
  | { status: 'permission_denied'; canAskAgain: boolean }
  | { status: 'error' };

/**
 * Shared gallery-picker flow for Home and Camera, so both handle permission
 * denial and unexpected picker errors the same way instead of drifting.
 * `canAskAgain` lets callers tell a transient denial (show the native
 * prompt again) apart from a permanent one (send the user to Settings).
 */
export async function pickImageFromGallery(): Promise<GalleryPickResult> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { status: 'permission_denied', canAskAgain: permission.canAskAgain };
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });

    if (picked.canceled || !picked.assets[0]) {
      return { status: 'canceled' };
    }

    return { status: 'picked', uri: picked.assets[0].uri };
  } catch {
    return { status: 'error' };
  }
}
