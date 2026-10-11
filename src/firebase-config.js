// Firebase の設定値。複数の端末(生徒のタブレットや先生のPC)で対戦するために使います。
// 取得方法は README.md の「Firebase の設定」を参照してください。
// databaseURL が空のままの場合は「お試しモード」(同じブラウザ内のタブ同士だけ)で動きます。
// Realtime Database だけを使うため、databaseURL があれば動作します。
window.FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  databaseURL: 'https://music-symbol-quest-v2-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: '',
  appId: '',
};
