# AI 战队指挥部 🛠️

我的 AI 工作流架构图，做成了一个卡通动画网页。

**在线查看：** https://yeyuruoying11.github.io/ai-crew-architecture/

## 谁在干活

| 角色 | 状态 | 负责 |
| --- | --- | --- |
| Claude | 总指挥 | 接需求、定方案、拆任务、派活、审查整合、交付 |
| 子 Agent 小队 | 在岗 | 调研代码库和文档、并行起草、独立盲测 |
| GPT Codex | 在岗 | 写功能代码、参考解答、测试脚本、环境 |
| DeepSeek | 待命 | 尚未接入 |

## 两条工作流

- **网页开发**：你提需求 → Claude 拆任务 → 子 Agent 调研 → Codex 写功能 → Claude 审查 → 子 Agent 测试 → 报告回传 → 交付
- **Benchmark Task 制作**：你定方向 → Claude 设计规格 → 子 Agent 并行起草 → Codex 写解答和测试 → 参考解跑通 → 子 Agent 盲测 → 结果回传 → 质检打包

单文件 `index.html`，无需构建，直接打开即可。
