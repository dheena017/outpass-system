import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { StatusBar, Style } from '@capacitor/status-bar';
import { PushNotifications } from '@capacitor/push-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const isNative = () => Capacitor.isNativePlatform();

export const initNativeFeatures = async () => {
  if (!isNative()) return;

  try {
    // Set status bar theme
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0f172a' }); // matches bg-slate-900

    // Request push notification permissions
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive === 'granted') {
      await PushNotifications.register();
    }
  } catch (err) {
    console.warn('Native initialization error:', err);
  }
};

export const nativeImpact = async () => {
  if (isNative()) {
    await Haptics.impact({ style: ImpactStyle.Medium });
  }
};
