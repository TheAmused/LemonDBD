// frontend/src/locales/ja/errorPages.ts
export default {
  backHome: 'ホームに戻る',
  notFound: {
    code: '404',
    title: 'ページが見つかりません',
    text: 'このページは存在しないか、移動されたか、アドレスに誤りがあります。',
  },
  forbidden: {
    code: '403',
    title: 'アクセスが禁止されています',
    textSignedIn: 'このアカウントにはこのページを開く権限がありません。',
    textGuest: 'このページを開くには、管理者アカウントでログインしてください。',
  },
  blocked: {
    code: 'ブロック中',
    title: 'ページはブロックされています',
    text: '{page} は管理者によって一時的にオフにされています。',
    textGeneric: 'このページは管理者によって一時的にオフにされています。',
    hint: 'メンテナンスや不具合修正のための一時的な措置であることがほとんどです。サイトのその他の部分は通常どおり使えます。',
  },
} as const;
