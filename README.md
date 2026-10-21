# AI 像素工作室

我的 AI 工作流，做成了一个像素办公室：Claude 坐主位派活，子 Agent 被召唤时在工位上"刷"地出现、干完下线，GPT Codex 守着双屏写代码，DeepSeek 在沙发上待命。

**在线查看：** https://yeyuruoying11.github.io/ai-crew-architecture/

## 谁在干活

| 角色 | 状态 | 负责 |
| --- | --- | --- |
| Claude | 老大 | 接需求、定方案、拆任务、派活、审查整合、交付 |
| 子 Agent | 按需召唤 | 调研代码库和文档、并行起草、独立盲测 |
| GPT Codex | 在岗 | 写功能代码、参考解答、测试脚本、环境 |
| DeepSeek | 待命 | 尚未接入 |

## 两条工作流

- **网页开发**：你提需求 → Claude 拆任务 → 子 Agent 调研 → Codex 写功能 → Claude 审查 → 子 Agent 测试 → 报告回传 → 交付
- **Benchmark Task 制作**：你定方向 → Claude 设计规格 → 子 Agent 并行起草 → Codex 写解答和测试 → 参考解跑通 → 子 Agent 盲测 → 结果回传 → 质检打包

## 文件

- `index.html`：像素工作室（单文件，素材已内嵌）
- `cartoon.html`：第一版卡通架构图
- `src/`：页面模板和素材打包脚本（需要本地有 Pixel Agents 仓库）

## 素材

像素角色和家具来自 [Pixel Agents](https://github.com/pablodelucca/pixel-agents)（MIT），角色基于 JIK-A-4 的 [MetroCity](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack)（CC0）。详见 `THIRD_PARTY_NOTICES.md`。
