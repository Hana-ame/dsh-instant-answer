/**
 * dsh-instant-answer — Host 半边。
 *
 * 本插件的所有行为都在 Client 半边（client.js）：它只增强
 * `ask_user_question` 提问卡片的单选交互，Host 侧没有可注册的服务、
 * 路由或工具。保留一个空的 apply 以满足 composition 的 entry 约定
 * （与 `@deepseek-ai/dsh-client-ui-user-questions` 的 lib/index.js 同形）。
 */

export const name = 'dsh-instant-answer';

/** Host plugin body: nothing to register on the host side. */
export function apply() {}