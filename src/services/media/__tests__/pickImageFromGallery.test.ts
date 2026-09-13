import * as ImagePicker from 'expo-image-picker';

import { pickImageFromGallery } from '../pickImageFromGallery';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const mockedPicker = ImagePicker as jest.Mocked<typeof ImagePicker>;

describe('pickImageFromGallery', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns permission_denied when the user does not grant gallery access', async () => {
    mockedPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false } as never);

    const result = await pickImageFromGallery();

    expect(result).toEqual({ status: 'permission_denied' });
    expect(mockedPicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('returns canceled when the user dismisses the picker', async () => {
    mockedPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
    mockedPicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null } as never);

    const result = await pickImageFromGallery();

    expect(result).toEqual({ status: 'canceled' });
  });

  it('returns the picked image uri on success', async () => {
    mockedPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
    mockedPicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///photo.jpg' }],
    } as never);

    const result = await pickImageFromGallery();

    expect(result).toEqual({ status: 'picked', uri: 'file:///photo.jpg' });
  });

  it('returns error when the picker throws unexpectedly', async () => {
    mockedPicker.requestMediaLibraryPermissionsAsync.mockRejectedValue(new Error('boom'));

    const result = await pickImageFromGallery();

    expect(result).toEqual({ status: 'error' });
  });
});
