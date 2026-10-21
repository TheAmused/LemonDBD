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
  error: {
    code: 'エラー',
    title: '問題が発生しました',
    text: 'このページで予期しないエラーが発生しました。もう一度お試しください。繰り返し起きる場合はホームに戻ってください。',
    retry: '再試行',
    reference: '参照コード',
  },
} as const;
