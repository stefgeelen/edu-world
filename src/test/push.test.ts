import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The device side of parent push notifications (src/lib/push.ts): what a
// browser can do, and the permission → subscribe → save order.

let vapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
vi.mock('@/lib/pushConfig', () => ({
  get VAPID_PUBLIC_KEY() {
    return vapidKey;
  },
}));

const rpc = vi.fn(async () => ({ data: null, error: null }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...(args as [])) },
}));

let ios = false;
let standalone = false;
vi.mock('@/lib/platform', () => ({
  isIos: () => ios,
  isStandalone: () => standalone,
}));

import { pushSupport, readPushStatus, enablePush, disablePush, deviceLabel } from '@/lib/push';

const subscription = {
  endpoint: 'https://push.example/abc',
  toJSON: () => ({ keys: { p256dh: 'p-key', auth: 'a-key' } }),
  unsubscribe: vi.fn(async () => true),
};

let existing: typeof subscription | null = null;
const pushManager = {
  getSubscription: vi.fn(async () => existing),
  subscribe: vi.fn(async () => subscription),
};
const registration = { pushManager };

function installPushApis(permission: NotificationPermission, requestResult: NotificationPermission = permission) {
  Object.defineProperty(window, 'PushManager', { value: function PushManager() {}, configurable: true });
  Object.defineProperty(window, 'Notification', {
    value: { permission, requestPermission: vi.fn(async () => requestResult) },
    configurable: true,
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      getRegistration: vi.fn(async () => registration),
      register: vi.fn(async () => registration),
      ready: Promise.resolve(registration),
    },
    configurable: true,
  });
}

function removePushApis() {
  delete (window as { PushManager?: unknown }).PushManager;
  delete (window as { Notification?: unknown }).Notification;
  // @ts-expect-error test cleanup
  delete navigator.serviceWorker;
}

describe('push', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    ios = false;
    standalone = false;
    existing = null;
  });

  afterEach(removePushApis);

  describe('pushSupport', () => {
    it('is unsupported without a configured key', () => {
      installPushApis('default');
      vapidKey = '';
      expect(pushSupport()).toBe('unsupported');
    });

    it('is supported when the browser has the push APIs', () => {
      installPushApis('default');
      expect(pushSupport()).toBe('supported');
    });

    it('asks an iPhone in the browser to install first', () => {
      ios = true;
      expect(pushSupport()).toBe('needs-install');
    });

    it('is unsupported on an iPhone from the home screen without the APIs (old iOS)', () => {
      ios = true;
      standalone = true;
      expect(pushSupport()).toBe('unsupported');
    });
  });

  describe('readPushStatus', () => {
    it('reports denied when the browser blocks notifications', async () => {
      installPushApis('denied');
      expect(await readPushStatus()).toBe('denied');
    });

    it('reports off when there is no subscription', async () => {
      installPushApis('granted');
      expect(await readPushStatus()).toBe('off');
      expect(rpc).not.toHaveBeenCalled();
    });

    it('reports on and saves the address again for the current parent', async () => {
      installPushApis('granted');
      existing = subscription;
      expect(await readPushStatus()).toBe('on');
      expect(rpc).toHaveBeenCalledWith('save_push_subscription', expect.objectContaining({
        p_endpoint: 'https://push.example/abc',
        p_p256dh: 'p-key',
        p_auth: 'a-key',
      }));
    });
  });

  describe('enablePush', () => {
    it('asks permission before registering the service worker', async () => {
      installPushApis('default', 'granted');
      const order: string[] = [];
      (Notification.requestPermission as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        order.push('permission');
        return 'granted';
      });
      (navigator.serviceWorker.register as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        order.push('register');
        return registration;
      });

      expect(await enablePush()).toBe('on');
      expect(order).toEqual(['permission', 'register']);
      expect(pushManager.subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
      expect(rpc).toHaveBeenCalledWith('save_push_subscription', expect.anything());
    });

    it('stops when the parent says no', async () => {
      installPushApis('default', 'denied');
      expect(await enablePush()).toBe('denied');
      expect(navigator.serviceWorker.register).not.toHaveBeenCalled();
      expect(rpc).not.toHaveBeenCalled();
    });

    it('throws when saving fails, so the screen can say so', async () => {
      installPushApis('default', 'granted');
      rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } } as never);
      await expect(enablePush()).rejects.toEqual({ message: 'boom' });
    });
  });

  describe('disablePush', () => {
    it('removes the address and unsubscribes this device', async () => {
      installPushApis('granted');
      existing = subscription;
      expect(await disablePush()).toBe('off');
      expect(rpc).toHaveBeenCalledWith('remove_push_subscription', { p_endpoint: 'https://push.example/abc' });
      expect(subscription.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('deviceLabel', () => {
    it.each([
      ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 'je iPhone'],
      ['Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari', 'je Android-telefoon'],
      ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'je computer'],
      [null, 'een ander toestel'],
    ])('names %s as %s', (ua, label) => {
      expect(deviceLabel(ua)).toBe(label);
    });
  });
});
