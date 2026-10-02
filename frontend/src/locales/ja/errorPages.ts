// frontend/src/locales/ja/errorPages.ts
export default {
  backHome: 'ホームに戻る',
  goBack: '前のページへ',
  statusLabel: 'ステータス',
  addressLabel: 'アドレス',
  pageLabel: 'ページ',
  accountLabel: 'アカウント',
  guest: 'ゲスト（未ログイン）',
  nextTitle: '次に進む',
  notFound: {
    code: '404',
    status: '404 · 見つかりません',
    title: 'ページが見つかりません',
    text: 'このページは存在しないか、移動されたか、アドレスに誤りがあります。',
  },
  forbidden: {
    code: '403',
    status: '403 · アクセス禁止',
    title: 'アクセスが禁止されています',
    textSignedIn: 'このアカウントにはこのページを開く権限がありません。',
    textGuest: 'このページを開くには、管理者アカウントでログインしてください。',
  },
  blocked: {
    code: 'ブロック中',
    status: '管理者によりブロックされています',
    title: 'ページはブロックされています',
    text: '{page} は管理者によって一時的にオフにされています。',
    textGeneric: 'このページは管理者によって一時的にオフにされています。',
    hint: 'メンテナンスや不具合修正のための一時的な措置であることがほとんどです。サイトのその他の部分は通常どおり使えます。',
  },
} as const;
