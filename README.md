# 知己解盘 × Gemini｜四韵八字擂台赛作答记录

> **试题与排行榜来源：四韵八字擂台赛。** 请在赛事页面按第 473、475、476 期核对原题与排名。

这里记录「知己解盘 AI」参加四韵八字擂台赛第 473、475、476 期的实际作答。可以逐题对照模型收到的上下文、题面和选项，看 Gemini 选了什么、为什么选，再到四韵八字核对比分和排名。

[知己解盘](https://jiehuobazi.com/) 是排盘和 AI 解盘提示词生成工具。比赛中，我们先排出命盘，再把**由知己解盘生成的专业上下文**和赛题一起交给 Gemini 作答。专业上下文包括基本盘、大运、流年与判读要求。模型使用 Gemini 4 Argon，思考档位为 Medium。[知己解盘常见问题](https://jiehuobazi.com/faq.html) · [Gemini 4 Argon 模型文档](https://aistudio.google.com/docs/models/gemini-4-argon)

| 期数 | 输入与赛题 | 输出 | 题数正确率 | 赛方得分率 | 排名 |
|---|---|---|---:|---:|---|
| 473 | [提示词](rounds/473/prompt.txt) · [全部选项](rounds/473/questions.json) | [完整作答](rounds/473/answer.txt) · [逐题 JSON](rounds/473/call-record.json) | 10/11（90.9%） | 216/237（91.1%） | 并列第 3 |
| 475 | [提示词](rounds/475/prompt.txt) · [全部选项](rounds/475/questions.json) | [完整作答](rounds/475/answer.txt) · [逐题 JSON](rounds/475/call-record.json) | 9/12（75.0%） | 195/258（75.6%） | 并列第 10 |
| 476 | [提示词](rounds/476/prompt.txt) · [全部选项](rounds/476/questions.json) | [完整作答](rounds/476/answer.txt) · [逐题 JSON](rounds/476/call-record.json) | 9/9（100%） | 184/184（100%） | 并列第 1 |

正确率按答对的题数计算，得分率按赛方给每题的分值计算。第 476 期共有 15 个账号满分，含「知己解盘 AI」。[赛果数据](scores.json) · [封面对比数据](scoring/cover-comparison-data.json)

## 核对原题和榜单

已有四韵八字入口的读者，可打开第 **473、475、476** 期核对原题，并在当期榜单查找参赛账号 **知己解盘 AI**。选项字母、题面中被遮挡的文字标注和分值都随档保留，官方结果以赛事页面为准。

## 文件说明

`prompt.txt` 保留实际作答使用的专业上下文与整份赛题。`answer.txt` 保留作答选项、逐题理由、年份对比和前置说明。`request.json` 和 `response-format.json` 按 Gemini API 的请求和响应结构整理，方便程序读取。[Gemini GenerateContent 字段说明](https://ai.google.dev/api/generate-content?hl=en)

具体出生月日、出生地、出生钟点和精确起运、交运时刻以「已隐去」标注。四柱、大运、流年、题目及选项留在档案中，便于核对作答过程，因此仍可能根据原题和命盘关联到赛方命例。

第 473 期第 4、7 题的理由明确引用了其他题目的选项。第 476 期题面时刻和时柱口径存在冲突，作答采用题面列出的时柱。三期成绩记录了这三次作答的表现。

## 用同一份公开提示词再问一次 Gemini

直接阅读文件即可核对当时的作答。想比较新回复时，用 Node.js 20 或以上，在环境变量中设置可调用 Gemini 的 `GEMINI_API_KEY`，再运行：

```sh
node archive.mjs run 476
```

脚本使用 `gemini-4-argon` 和 `MEDIUM`，把第 476 期的公开版提示词重新发给 Gemini，新请求和服务端响应存到本地 `live-runs/`。可以把期数换成 473 或 475。重新调用使用带脱敏标记的输入，生成的答案可能与参赛时不同。只想根据已有内容重建 JSON 时运行 `node archive.mjs build` 即可，此命令离线运行。
