# AI 像素工作室

我的 AI 工作流，做成了一个像素办公室：Claude 坐主位派活，子 Agent 被召唤时在工位上"刷"地出现、干完下线，GPT Codex 守着双屏写代码（额度用完，10 月 27 日回来），DeepSeek 接手翻译、文案、总结这类文字活，还通过 opencode 给机器人仿真任务写代码初稿：接到活就从沙发走到自己的工位，交回草稿由 Claude 检查后再用。

**在线查看：** https://yeyuruoying11.github.io/ai-crew-architecture/

## 谁在干活

| 角色 | 状态 | 负责 |
| --- | --- | --- |
| Claude | 老大 | 接需求、定方案、拆任务、派活（按难易选模型和推理强度）、审查整合、交付 |
| 子 Agent | 按需召唤 | 调研代码库和文档、并行起草、照模板写代码、独立盲测和挑错；同一个模型，按难易选推理强度 |
| GPT Codex | 额度用完（10 月 27 日回来） | 写功能代码、参考解答、测试脚本、环境 |
| DeepSeek | 在岗（文字活；10 月 21 日起兼写仿真任务代码初稿） | 翻译初稿、精简文案、总结长文档和日志、造测试数据和格式转换、截图初筛、头脑风暴（走 API，不能读仓库、改文件、跑测试）；机器人仿真项目里用 deepseek-v4-pro 经 opencode（`opencode run --auto`）照模板写任务代码、测试和文档初稿。交回的都是草稿，Claude 派子 Agent 审查、改好后再用，每次记一笔质量评级 |

## 三条工作流

- **网页开发**：你提需求 → Claude 拆任务 → 子 Agent 调研 → Codex 写功能 → Claude 审查 → DeepSeek 写文字初稿（翻译 / 文案 / 总结） → Claude 检查草稿 → 子 Agent 测试 → 报告回传 → 交付
- **Benchmark Task 制作**：你定方向 → Claude 设计规格 → 子 Agent 并行起草 → DeepSeek 改写题面、造数据 → Claude 筛选 → Codex 写解答和测试 → 参考解跑通 → 子 Agent 盲测 → 结果回传 → 质检打包
- **机器人仿真任务**：你定任务 → Claude 找模板定规格 → DeepSeek 写代码初稿（opencode） → 初稿交回 → 子 Agent 审查 → 结果回传、Claude 修好 → GPU 跑仿真 → DeepSeek 压缩日志 → 日志摘要交回 Claude 核实 → 核对并登记 → 推私人仓库交付

## 派活规则

页面下方的「派活规则」（谁干什么、子 Agent 开多大推理强度、DeepSeek 干活记录和花费）是生成的：在 pocket-rivals 仓库里跑 `tools/ai_page.py <页面文件> --balance …`，对 `index.html` 和 `src/template.html` 各跑一次，只重写 `<!--AI-RULES-START-->` 到 `<!--AI-RULES-END-->` 之间。

## 文件

- `index.html`：像素工作室（单文件，素材已内嵌）
- `cartoon.html`：第一版卡通架构图
- `src/`：页面模板和素材打包脚本（需要本地有 Pixel Agents 仓库）

## 素材

像素角色和家具来自 [Pixel Agents](https://github.com/pablodelucca/pixel-agents)（MIT），角色基于 JIK-A-4 的 [MetroCity](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack)（CC0）。详见 `THIRD_PARTY_NOTICES.md`。
