import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAca67B8iJmoro5Pwhdtafvph4szeAeTAI',
  authDomain: 'voicesofheritage-ef533.firebaseapp.com',
  projectId: 'voicesofheritage-ef533',
  storageBucket: 'voicesofheritage-ef533.firebasestorage.app',
  messagingSenderId: '767457159364',
  appId: '1:767457159364:web:df776fd1e10c41b339c191',
  measurementId: 'G-95XB39W998',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
