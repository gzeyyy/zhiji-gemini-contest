import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('.', import.meta.url));
const issues = ['473', '475', '476'];
const contestModel = 'gemini-4-argon';
const contestThinkingLevel = 'MEDIUM';
const read = file => readFile(join(root, file), 'utf8');
const readJson = async file => JSON.parse(await read(file));
const serialize = value => JSON.stringify(value, null, 2) + '\n';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const generateContentUrl = model =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

function makeRequest(prompt, thinkingLevel) {
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
  if (thinkingLevel) body.generationConfig = { thinkingConfig: { thinkingLevel } };
  return body;
}

async function build() {
  const { rounds } = await readJson('scores.json');
  for (const issue of issues) {
    const folder = join('rounds', issue);
    const [prompt, answer, structured, questions] = await Promise.all([
      read(join(folder, 'prompt.txt')),
      read(join(folder, 'answer.txt')),
      readJson(join(folder, 'answers.json')),
      readJson(join(folder, 'questions.json')),
    ]);
    assert.equal(sha256(prompt), structured.prompt_sha256);
    const selections = structured.answers.map(({ question_id, selected_letter }) => ({
      question_id, selected_letter,
    }));
    assert.deepEqual(selections, structured.answer_summary);
    assert.deepEqual(selections.map(item => item.question_id), questions.map(item => item.question));
    for (const [index, item] of structured.answers.entries()) {
      assert.equal(item.selected_text, questions[index].options[item.selected_letter]);
      assert(answer.includes(item.reason), `第${issue}期第${item.question_id}题理由不一致`);
    }
    const score = rounds.find(round => String(round.issue) === issue);
    assert.equal(score.question_accuracy.total, questions.length);
    assert.equal(score.weighted_score.max_points, questions.reduce((sum, item) => sum + item.points, 0));

    const response = {
      candidates: [{ content: { role: 'model', parts: [{ text: answer }] } }],
    };
    const record = {
      record_type: 'gemini_contest_public_archive',
      source: '参赛时留存的输入和回复，仅遮盖具体出生及起运、交运信息',
      issue: Number(issue),
      model: {
        name: 'Gemini 4 Argon',
        api_model_id: contestModel,
        thinking_level: contestThinkingLevel,
      },
      request: {
        body_file: 'request.json',
        replay_method: 'POST',
        replay_url: generateContentUrl(contestModel),
        prompt_file: 'prompt.txt',
        prompt_sha256: structured.prompt_sha256,
        questions_file: 'questions.json',
      },
      result: {
        correct_answers: score.question_accuracy.correct,
        question_count: score.question_accuracy.total,
        points: score.weighted_score.points,
        max_points: score.weighted_score.max_points,
        rank: score.rank.value,
        tied: score.rank.tied,
      },
      answer_key: selections.map(item => item.selected_letter).join(' '),
      ...(structured.preface ? { response_note: structured.preface } : {}),
      answers: structured.answers,
      response_file: 'response-format.json',
      response,
    };

    await Promise.all([
      writeFile(join(root, folder, 'request.json'), serialize(makeRequest(prompt, contestThinkingLevel))),
      writeFile(join(root, folder, 'response-format.json'), serialize(response)),
      writeFile(join(root, folder, 'call-record.json'), serialize(record)),
    ]);
    console.log(`第${issue}期，已检查并生成 ${questions.length} 题的记录`);
  }
}

async function run(issue, model = contestModel, thinkingLevel = model === contestModel ? contestThinkingLevel : undefined) {
  const key = process.env.GEMINI_API_KEY;
  if (!issues.includes(issue)) throw new Error('请指定 473、475 或 476。');
  if (!key) throw new Error('请在环境变量 GEMINI_API_KEY 中提供 API 密钥。');
  if (!model || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(model)) {
    throw new Error('请指定你的账号可用的 Gemini API 模型 ID。');
  }
  if (thinkingLevel && !['MINIMAL', 'LOW', 'MEDIUM', 'HIGH'].includes(thinkingLevel)) {
    throw new Error('思考档位可为 MINIMAL、LOW、MEDIUM 或 HIGH。');
  }

  const prompt = await read(join('rounds', issue, 'prompt.txt'));
  const request = serialize(makeRequest(prompt, thinkingLevel));
  const url = generateContentUrl(model);
  const started = new Date();
  const directory = join(root, 'live-runs', `${issue}-${started.toISOString().replaceAll(':', '-')}-${randomUUID()}`);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'request.json'), request);
  const record = {
    record_type: 'gemini_api_run',
    issue: Number(issue),
    url,
    method: 'POST',
    started_at: started.toISOString(),
    prompt_sha256: sha256(prompt),
    request_file: 'request.json',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: request,
      signal: AbortSignal.timeout(300_000),
    });
    record.http_status = response.status;
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(join(directory, 'response.json'), bytes);
    record.response_file = 'response.json';
    if (!response.ok) process.exitCode = 1;
  } catch (error) {
    record.error_name = error.name;
    process.exitCode = 1;
  }
  record.finished_at = new Date().toISOString();
  await writeFile(join(directory, 'call-record.json'), serialize(record));
  console.log(directory);
}

const [command = 'build', ...args] = process.argv.slice(2);
try {
  if (command === 'build' && args.length === 0) await build();
  else if (command === 'run' && args.length >= 1 && args.length <= 3) await run(...args);
  else throw new Error('用法：node archive.mjs build 或 node archive.mjs run <期数> [API模型ID] [档位]');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
