import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card, Header, Text } from '../../src/components/ui';
import { CATEGORIES, CATEGORY_ICONS } from '../../src/constants/categories';
import { useAnalysisSessionStore } from '../../src/state/useAnalysisSessionStore';
import { useTheme } from '../../src/theme';
import { ProblemCategory } from '../../src/types/analysis';

export default function HomeScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const setStartCategory = useAnalysisSessionStore((s) => s.setStartCategory);
  const runAnalysis = useAnalysisSessionStore((s) => s.runAnalysis);

  const openCamera = (category?: ProblemCategory) => {
    setStartCategory(category ?? null);
    router.push('/camera');
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('errors.genericTitle'), t('camera.permissionBody'));
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });

    if (picked.canceled || !picked.assets[0]) return;

    router.push('/result');
    void runAnalysis({ imageUri: picked.assets[0].uri });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Header title={t('common.appName')} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text variant="title2">{t('home.headline')}</Text>
          <Text variant="body" color="secondary" style={{ marginTop: 4 }}>
            {t('home.subheadline')}
          </Text>
        </View>

        <Pressable
          onPress={() => openCamera()}
          accessibilityRole="button"
          accessibilityLabel={t('home.ctaPhoto')}
          style={({ pressed }) => [
            styles.primaryCta,
            {
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radii.xl,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.primaryCtaIcon,
              { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: theme.radii.pill },
            ]}
          >
            <Ionicons name="camera" size={30} color={theme.colors.onAccent} />
          </View>
          <Text variant="headline" color="inverse" style={{ marginTop: theme.spacing.sm }}>
            {t('home.ctaPhoto')}
          </Text>
        </Pressable>

        <Pressable
          onPress={pickFromGallery}
          accessibilityRole="button"
          accessibilityLabel={t('home.ctaGallery')}
          style={({ pressed }) => [
            styles.secondaryCta,
            {
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="images-outline" size={20} color={theme.colors.textPrimary} />
          <Text variant="bodyStrong" style={{ marginLeft: 8 }}>
            {t('home.ctaGallery')}
          </Text>
        </Pressable>

        <View>
          <Text variant="footnote" color="tertiary" style={{ marginBottom: theme.spacing.xs }}>
            {t('home.categoriesTitle')}
          </Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((category) => (
              <Pressable
                key={category}
                onPress={() => openCamera(category)}
                accessibilityRole="button"
                accessibilityLabel={t(`home.category.${category}`)}
                style={styles.categoryItem}
              >
                <Card style={styles.categoryCard} padded={false}>
                  <View style={styles.categoryCardInner}>
                    <Ionicons
                      name={CATEGORY_ICONS[category] as never}
                      size={22}
                      color={theme.colors.accent}
                    />
                    <Text variant="footnote" style={{ marginTop: 8 }} numberOfLines={1}>
                      {t(`home.category.${category}`)}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  primaryCta: {
    padding: 24,
    alignItems: 'center',
  },
  primaryCtaIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryItem: {
    width: '30%',
  },
  categoryCard: {
    aspectRatio: 1,
  },
  categoryCardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
});
