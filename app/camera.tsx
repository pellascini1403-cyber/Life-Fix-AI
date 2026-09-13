import { Ionicons } from '@expo/vector-icons';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from 'expo-router';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Input, Text } from '../src/components/ui';
import { useAnalysisSessionStore } from '../src/state/useAnalysisSessionStore';
import { useTheme } from '../src/theme';

export default function CameraScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing] = useState<CameraType>('back');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const cameraRef = useRef<CameraView>(null);

  const startCategory = useAnalysisSessionStore((s) => s.startCategory);
  const runAnalysis = useAnalysisSessionStore((s) => s.runAnalysis);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) setCapturedUri(photo.uri);
    } catch {
      Alert.alert(t('errors.genericTitle'), t('errors.cameraUnavailable'));
    }
  };

  const handlePickFromGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!picked.canceled && picked.assets[0]) setCapturedUri(picked.assets[0].uri);
  };

  const confirmPhoto = () => {
    if (!capturedUri) return;
    router.replace('/result');
    void runAnalysis({
      imageUri: capturedUri,
      userContext: context.trim() || undefined,
      category: startCategory ?? undefined,
    });
  };

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="camera-outline" size={48} color={theme.colors.accent} />
        <Text variant="title2" style={{ marginTop: theme.spacing.md, textAlign: 'center' }}>
          {t('camera.permissionTitle')}
        </Text>
        <Text
          variant="body"
          color="secondary"
          style={{ marginTop: theme.spacing.xs, textAlign: 'center' }}
        >
          {t('camera.permissionBody')}
        </Text>
        <View style={{ marginTop: theme.spacing.lg, width: '100%' }}>
          <Button label={t('camera.permissionCta')} onPress={requestPermission} />
        </View>
        <View style={{ marginTop: theme.spacing.sm, width: '100%' }}>
          <Button label={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  if (capturedUri) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Image
          source={{ uri: capturedUri }}
          accessibilityLabel={t('camera.previewAlt')}
          style={styles.preview}
        />
        <View
          style={[
            styles.previewFooter,
            { paddingBottom: insets.bottom + theme.spacing.md, backgroundColor: theme.colors.background },
          ]}
        >
          <Input
            placeholder={t('camera.contextPlaceholder')}
            accessibilityLabel={t('camera.contextPlaceholder')}
            value={context}
            onChangeText={setContext}
            multiline
          />
          <View style={{ height: theme.spacing.sm }} />
          <Button label={t('camera.usePhoto')} onPress={confirmPhoto} />
          <View style={{ height: theme.spacing.xs }} />
          <Button label={t('camera.retake')} variant="ghost" onPress={() => setCapturedUri(null)} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />
      <View style={[styles.topBar, { paddingTop: insets.top + theme.spacing.xs }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          hitSlop={4}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
      </View>
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + theme.spacing.lg }]}>
        <Pressable
          onPress={handlePickFromGallery}
          accessibilityRole="button"
          accessibilityLabel={t('home.ctaGallery')}
          style={styles.galleryButton}
        >
          <Ionicons name="images-outline" size={26} color="#fff" />
        </Pressable>
        <Pressable
          onPress={handleCapture}
          accessibilityRole="button"
          accessibilityLabel={t('camera.shutterHint')}
          style={styles.shutter}
        >
          <View style={styles.shutterInner} />
        </Pressable>
        <View style={styles.galleryButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  preview: {
    flex: 1,
  },
  previewFooter: {
    padding: 16,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  galleryButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
});
