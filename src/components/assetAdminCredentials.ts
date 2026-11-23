import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword, inMemoryPersistence, initializeAuth,
  reauthenticateWithPopup, signInWithEmailAndPassword, type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import adminAccount from '../../scripts/asset-admin-auth.json';
import { auth, googleProvider } from '../firebase';
import { api } from './assetAdminApi';

export const adminHandle = adminAccount.handle;

export async function loginAssetAdmin(handle: string, password: string) {
  if (handle.trim().toLowerCase() !== adminHandle || !password) {
    throw new Error('Nhập tài khoản puugoo và mật khẩu.');
  }
  await signInWithEmailAndPassword(auth, adminAccount.passwordEmail, password);
}

export async function linkAssetAdminAccount(owner: User, password: string, create: boolean) {
  // Confirm the existing administrator and prove possession of the game account
  // in an isolated Firebase session so linking never switches the current user.
  const verified = await reauthenticateWithPopup(owner, googleProvider);
  const app = initializeApp(firebaseConfig, 'asset-admin-link-' + crypto.randomUUID());
  try {
    const isolated = initializeAuth(app, { persistence: inMemoryPersistence });
    const credential = create
      ? await createUserWithEmailAndPassword(isolated, adminAccount.passwordEmail, password)
      : await signInWithEmailAndPassword(isolated, adminAccount.passwordEmail, password);

    await api<{ passwordLinked: boolean }>(verified.user, 'password-account', {
      body: { passwordToken: await credential.user.getIdToken() },
    });
  } finally {
    await deleteApp(app);
  }
}

export function credentialMessage(cause: unknown) {
  const code = cause && typeof cause === 'object' && 'code' in cause ? cause.code : undefined;
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Tên tài khoản hoặc mật khẩu chưa đúng.';
  }
  if (code === 'auth/email-already-in-use') return 'Tài khoản puugoo đã tồn tại. Chọn dùng tài khoản có sẵn.';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Cửa sổ xác minh Google đã đóng.';
  if (code === 'auth/too-many-requests') return 'Đã thử quá nhiều lần. Hãy đợi một lúc rồi thử lại.';
  if (code === 'auth/network-request-failed') return 'Không kết nối được với hệ thống đăng nhập.';
  return cause instanceof Error ? cause.message : 'Đăng nhập gặp lỗi.';
}
