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

  it('returns permission_denied with canAskAgain=true on a transient denial', async () => {
    mockedPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
    } as never);

    const result = await pickImageFromGallery();

    expect(result).toEqual({ status: 'permission_denied', canAskAgain: true });
    expect(mockedPicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('returns permission_denied with canAskAgain=false once denied permanently', async () => {
    mockedPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    } as never);

    const result = await pickImageFromGallery();

    expect(result).toEqual({ status: 'permission_denied', canAskAgain: false });
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
