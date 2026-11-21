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
client.js          Client 半边：document capture + bubble click 监听 + 右下角开关
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

- 监听分两段：**capture 只记录被点的选项**（不提交），冒泡后 `setTimeout(0)`
  等 React 把草稿重渲染完，再触发 footer 主按钮的原生 `click()`，让原组件自己的
  `continueFlow → submitDrafts` 完成发送，因此所有校验、错误提示、`busy` 锁定与
  迟到回复处理都保留。
- 提交前**校验被点选项 `aria-checked === 'true'`**；若没落到该选项（时序异常），
  宁可不发，也绝不发错答案。
- 选项已卸载（`isConnected === false`，多题批次翻页）→ 立即放弃。
- 选择器写的是 `[class*="footerActions"] button[class*="primary"]`（CSS 子串匹配），
  对 module CSS 的 hash 类名（`Mbwy4a_primary`、`uV2eYG_primary` 等）都稳。

## 版本记录

### 0.1.1 — 修复「点任何选项都回复第一个」

0.1.0 在 **capture 阶段**就 `click()` 提交按钮，而选项自己的 React `onClick`
（`choose()` 写草稿）此时**还没执行**。原生 `submitDrafts(drafts)` 读的是本次渲染
闭包里的 drafts —— 于是发出去的是**点击前的旧草稿**。首项若带
`(Recommended)`，原生 `initialDrafts` 会把它预选中，所以表现为
「点任何选项都回复第一个」。

（多题批次里更直观：点第 3 项发的是第 2 项 —— 永远是"上一次"的选择。）

修法：capture 只记录目标，冒泡后 `setTimeout(0)` 等草稿落地再提交，并用
`aria-checked` 校验被点项确实已选中。

**A/B 验证**（Playwright 真实 Chromium，模拟原生预选+异步重渲染时序）：

| 操作 | 0.1.0 | 0.1.1 |
|---|---|---|
| 点 Option B | ❌ 发出 `Option A (Recommended)` | ✅ 发出 `Option B` |
| 点 Option C | ❌ 发出 `Option B` | ✅ 发出 `Option C` |
| 点预选的 A | ❌ 发出 `Option C` | ✅ 发出 `Option A (Recommended)` |
| 开关关闭时点击 | ✅ 不发送 | ✅ 不发送 |
| Ctrl+点击 | ✅ 不发送 | ✅ 不发送 |
