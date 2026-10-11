export function generatePassword(length: number = 16): string {
  // 不能包含 `:` 和 `|`：服务端用它们区分 `key:secret` 与 `用户名|密码`，含有时会拒绝创建令牌
  const charset = [
    ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};,.<>?",
  ];

  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  let password = "";

  for (let i = 0; i < length; i++) {
    password += charset[(randomValues[i] as number) % charset.length];
  }

  return password;
}
