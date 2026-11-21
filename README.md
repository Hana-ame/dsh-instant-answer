# dsh-instant-answer

让 `ask_user_question` 提问卡片的**单选选项**点击后立即提交整组答案，不再需要
再按一次「提交」。

## 用法

`ask_user_question` 卡片弹出后，直接点选项即可发送。多题批次里中间题主按钮是
「下一题」，点选项只翻页，不会提前交卷；最后一题主按钮是「提交」，点选项即发送。

右下角有一个「即时回答 · 开 / 关」小圆角状态条，一键开关本行为；状态存
`localStorage` 的 `dsh.instant-answer.enabled`，默认开。按住 Ctrl / Alt / Shift /
Meta 再点选项会绕过即时提交，只做普通选中（想临时只选中、不发送时用）。

## 不受影响的部分

- **多选题**（`role="checkbox"`）：仍需手动按「提交」。
- **自定义文本答案**：仍需手动按「提交」，或在文本框里按 Enter。
- **plan-review 审批卡片**：走原生审批按钮，本插件不接。
- **已结束问题的只读 review 卡片**：只读，没有提交通道。
- **按钮 disabled，或 batch 里还有未作答的问题**：原生 `submitDrafts` 会拒绝
  并提示，本插件不会发出不完整的答案。

## 布局

```
client.js          Client 半边：document capture-phase click 监听 + 右下角开关
index.js           Host 半边：空（无 Host 服务可注册）
cordis.patch.yml   bundle patch
package.json
```

`package.json` 的 `dsh.client.platform = "web"` 让 DSH 把它作为客户端插件 bundle
加载，不依赖任何宿主代码补丁，升级 DSH 不会失效。

## 安装

```
# 已在 ~/.dsh/profiles/web/package.json 的 dsh.profile.bundles 里追加
# "dsh-instant-answer"，dependencies 里加了 link: 指向本目录。
```

重启 web profile 后生效（本机这次因为运行中的 profile 的 HMR 已 dispose，
改完 `package.json` 需重启才能加载新 bundle）。

## 行为细节

- 监听用 capture-phase click：React 自己的 `onClick` 仍先写草稿
  （选中态、翻页器推进、`skipped=false`），然后本插件触发 footer 主按钮的原生
  `click()`，让原组件自己的 `continueFlow → submitDrafts` 完成发送，因此所有
  校验、错误提示、`busy` 锁定与迟到回复处理都保留。
- 选择器写的是 `[class*="footerActions"] button[class*="primary"]`（CSS 子串匹配），
  对 module CSS 的 hash 类名（`Mbwy4a_primary`、`uV2eYG_primary` 等）都稳。
  用 DSH 内置 Playwright 在真实 Chromium 上验证过：单选点提交 → 1 次发送；
  多选/修饰键点击/pager 主按钮（`下一题`）→ 不触发。
