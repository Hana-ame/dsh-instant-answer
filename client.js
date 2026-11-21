/**
 * dsh-instant-answer — Client 半边。
 *
 * 目标：`ask_user_question` 提问卡片里的**单选选项**点击后立即提交整组答案，
 * 而不是选中之后还要再按一次「提交」。
 *
 * 为什么不能靠 CSS 或改 DOM 结构：卡片是 module-class React 树，选项的 `onClick`
 * 只写草稿（`choose()`），答案只在 `submitDrafts()` 里经 `pending.answer()` 出口
 * （waterfall 或 rpc）送达 Host。DOM 层无法凭空产生一次提交，必须触发原组件的
 * 提交动作本身。
 *
 * 做法：在 document 上挂一个 capture-phase click 监听。点击落在单选选项
 * （`role="radio"`、未 disabled）上时，向上找该问题批次卡片（`[data-question-key]`）
 * 的 footer 主按钮；主按钮文本是「提交」/「Submit」时 click 它，让原组件自己的
 * `continueFlow → submitDrafts` 完成发送。
 *
 * 安全边界：
 *   - 只在 `role="radio"` 上生效。多选（`role="checkbox"`）、自定义文本、
 *     plan-review 审批卡片、review（已结束只读）卡片照旧；
 *   - 主按钮文本必须是「提交」/「Submit」：多题批次中间题主按钮是「下一题」，
 *     点选项只翻页，不会提前交卷；
 *   - 按钮 disabled，或 batch 里还有未作答的问题时，原组件的 `submitDrafts`
 *     会自行拒绝并提示，不会发出不完整的答案；
 *   - 常驻开关存 localStorage（`dsh.instant-answer.enabled`，默认开），
 *     右下角状态条一键开关；修饰键点击（Ctrl/Alt/Shift/Meta）绕过即时提交，
 *     只做普通选中。
 */

window.__ModuleLoader__.load({
	id: 'dsh-instant-answer',
	factory(require) {
		const React = require('react');
		const ReactDOM = require('react-dom');
		const h = React.createElement;

		/** localStorage key for the kill switch. */
		const ENABLED_KEY = 'dsh.instant-answer.enabled';

		function readEnabled() {
			try {
				const raw = window.localStorage.getItem(ENABLED_KEY);
				if (raw === null) return true;
				return raw !== '0' && raw !== 'false';
			} catch (_error) {
				return true;
			}
		}

		function writeEnabled(next) {
			try {
				window.localStorage.setItem(ENABLED_KEY, next ? '1' : '0');
			} catch (_error) {
				/* storage unavailable (private mode) — session-only toggle */
			}
		}

		/** Does this click target sit on a single-select option row? */
		function closestRadioOption(target) {
			const element = target instanceof Element ? target : null;
			if (element === null) return null;
			const option = element.closest('[role="radio"]');
			if (option === null || option.disabled === true) return null;
			return option;
		}

		/**
		 * The primary footer button of the same question batch as `option`.
		 * Uses the real DOM query engine so the selector stays honest
		 * (the bundle's CSS-module classes are hashed; the attribute-substring
		 * form `[class*="footerActions"] button[class*="primary"]` matches the
		 * footer action area and its primary button without coupling to a hash).
		 */
		function primaryButtonFor(option) {
			const card = option.closest('[data-question-key]');
			if (card === null) return null;
			const primary = card.querySelector('[class*="footerActions"] button[class*="primary"]');
			if (primary === null || primary.disabled === true) return null;
			return primary;
		}

		/** Submit only when the primary action is actually the submit action. */
		function isSubmitLabel(button) {
			const text = (button.textContent ?? '').trim();
			return text === '提交' || text === 'Submit';
		}

		function ToggleChip() {
			const [enabled, setEnabled] = React.useState(readEnabled);

			const toggle = React.useCallback((event) => {
				event.stopPropagation();
				setEnabled((current) => {
					const next = !current;
					writeEnabled(next);
					return next;
				});
			}, []);

			return ReactDOM.createPortal(
				h('button', {
					type: 'button',
					'data-instant-answer-toggle': '',
					onClick: toggle,
					title: enabled
						? '即时回答：单选选项点击即提交 · 点此关闭'
						: '即时回答：已关闭，需选中后按提交 · 点此开启',
					'aria-pressed': enabled,
					style: {
						position: 'fixed',
						right: '10px',
						bottom: '8px',
						zIndex: '8',
						appearance: 'none',
						border: '0.5px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35))',
						borderRadius: '999px',
						background: enabled
							? 'color-mix(in srgb, var(--dsw-alias-button-info-fill, #4d6bfe) 16%, transparent)'
							: 'transparent',
						color: 'var(--dsw-alias-label-tertiary, #8a8a8a)',
						font: 'inherit',
						fontSize: '10px',
						lineHeight: '16px',
						padding: '1px 8px',
						cursor: 'pointer',
						opacity: enabled ? '0.8' : '0.5',
					},
				}, enabled ? '即时回答 · 开' : '即时回答 · 关'),
				document.body);
		}

		return {
			inject: [],
			apply(ctx) {
				let chipHost = null;

				const onClickCapture = (event) => {
					if (!readEnabled()) return;
					if (event.button !== 0) return;
					if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
					const option = closestRadioOption(event.target);
					if (option === null) return;
					const primary = primaryButtonFor(option);
					if (primary === null || !isSubmitLabel(primary)) return;
					primary.click();
				};

				ctx.effect(() => {
					document.addEventListener('click', onClickCapture, true);

					chipHost = document.createElement('div');
					chipHost.dataset.instantAnswer = '';
					document.body.appendChild(chipHost);
					ReactDOM.render(h(ToggleChip), chipHost);

					return () => {
						document.removeEventListener('click', onClickCapture, true);
						if (chipHost !== null) {
							ReactDOM.unmountComponentAtNode(chipHost);
							chipHost.remove();
							chipHost = null;
						}
					};
				}, 'dsh-instant-answer: instant submit');
			},
		};
	},
});