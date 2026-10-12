// 服务端用 `:` 区分 `key:secret`、用 `|` 区分 `用户名|密码`，
// 因此令牌的用户名里不允许出现这两个字符（见 NodeGet PR #177）。
// 发送给服务端前把 `%`、`:`、`|` 编码，展示时再还原；`%` 也要编码，
// 否则用户名里本来就有的 `%3A` 之类的片段在还原时会被误解。
const ENCODE_MAP: Record<string, string> = {
  "%": "%25",
  ":": "%3A",
  "|": "%7C",
};

const DECODE_MAP: Record<string, string> = {
  "%25": "%",
  "%3A": ":",
  "%7C": "|",
};

export const encodeTokenUsername = (username: string): string =>
  username.replace(/[%:|]/g, (char) => ENCODE_MAP[char] as string);

// 只还原上面三种写法，其余 `%` 开头的内容（旧用户名里可能有）原样保留，不会报错。
export const decodeTokenUsername = (username: string): string =>
  username.replace(/%(?:25|3A|7C)/g, (match) => DECODE_MAP[match] as string);
