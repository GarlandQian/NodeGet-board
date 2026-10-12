import { useBackendStore } from "@/composables/useBackendStore";
import {
  getWsConnection,
  makeRpcFunction,
  RpcError,
} from "@/composables/useWsConnection";
import { AGENT_TEMPLATE_PERMISSIONS } from "@/components/token/tokenTemplates.ts";
import { generatePassword } from "@/lib/password";
import { encodeTokenUsername } from "@/lib/tokenUsername";

const { currentBackend } = useBackendStore();

// 服务端"未找到"的错误码，见 docs/api/errors.md
const RPC_NOT_FOUND = 105;

export const agentTokenName = (nodeUuid: string) => `[agent]:${nodeUuid}`;

// 按用户名对令牌执行操作（删除、改权限等）。令牌是按用户名查找的，
// 新令牌的用户名是编码过的；2026-07-29 之前创建的旧令牌没有编码，
// 所以先用编码名，服务端返回"未找到"时再用原名重试一次，其他错误直接抛出。
export async function withTokenName<T>(
  name: string,
  action: (targetToken: string) => Promise<T>,
): Promise<T> {
  const encodedName = encodeTokenUsername(name);
  try {
    return await action(encodedName);
  } catch (e) {
    const notFound = e instanceof RpcError && e.code === RPC_NOT_FOUND;
    if (!notFound || encodedName === name) throw e;
    return await action(name);
  }
}

function makeTokenObject(nodeUuid: string) {
  return {
    username: encodeTokenUsername(agentTokenName(nodeUuid)),
    password: generatePassword(16),
    timestamp_from: null,
    timestamp_to: null,
    version: 1,
    token_limit: [
      {
        // scopes: [{ global: null }],
        scopes: [
          {
            agent_uuid: nodeUuid,
          },
        ],
        permissions: AGENT_TEMPLATE_PERMISSIONS,
      },
    ],
  };
}

// 预生成 token
export async function preGenerateToken(
  nodeUuid: string,
  backend = currentBackend,
) {
  if (!backend.value) return;
  try {
    const result = await getWsConnection(backend.value.url).call<{
      key?: string;
      secret?: string;
    }>("token_create", {
      father_token: backend.value.token,
      token_creation: makeTokenObject(nodeUuid),
    });
    if (result?.key && result?.secret) {
      return `${result.key}:${result.secret}`;
    }
  } catch (e) {
    console.error("Token pre-generation failed:", e);
  }
}

export async function reGenerateToken(
  nodeUuid: string,
  backend = currentBackend,
) {
  if (!backend.value) return;
  const { url, token } = backend.value;
  try {
    try {
      await withTokenName(agentTokenName(nodeUuid), (target_token) =>
        getWsConnection(url).call<{
          key?: string;
          secret?: string;
        }>("token_delete", { token, target_token }),
      );
    } catch {}

    return preGenerateToken(nodeUuid, backend);
  } catch (e) {
    console.error("Token re-generation failed:", e);
  }
}

export async function upgradeTokenLimit(
  nodeUuid: string,
  backend = currentBackend,
) {
  if (!backend.value) return;
  const { token } = backend.value;
  const rpc = makeRpcFunction();
  try {
    // const tokenDetail = await rpc<Token>("token_edit", {
    //     "token":`[agent]:${nodeUuid}`,
    //     "supertoken":backend.value?.token || ''
    // })
    await withTokenName(agentTokenName(nodeUuid), (target_token) =>
      rpc("token_edit", {
        token,
        target_token,
        limit: makeTokenObject(nodeUuid).token_limit,
      }),
    );
  } catch (e) {
    console.error("Token update failed:", e);
  }
}
