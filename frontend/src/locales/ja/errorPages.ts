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
    text: 'このページは現在、訪問者には公開されていません。',
  },
} as const;
