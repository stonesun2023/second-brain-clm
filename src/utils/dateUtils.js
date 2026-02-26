/**
 * 时间智能处理：把用户输入的相对时间描述转换为具体日期
 * 例："明天下午3点" → "2026/02/27 15:00"
 */

// 获取今天的基准日期
export function getBaseDate() {
  return new Date();
}

// 将相对时间描述 + AI 解析结果注入到 item 的 deadline 字段
// 输入：用户原始文本（如"明天开会"、"下周五提交"）
// 输出：{ hasTime: true/false, deadline: "YYYY-MM-DD HH:mm" or "" }
export function parseDateFromText(text) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const patterns = [
    { regex: /今天|今日/, offset: 0 },
    { regex: /明天|明日/, offset: 1 },
    { regex: /后天/, offset: 2 },
    { regex: /大后天/, offset: 3 },
    { regex: /下周一/, offset: (8 - now.getDay()) % 7 + 1 },
    { regex: /下周二/, offset: (9 - now.getDay()) % 7 + 1 },
    { regex: /下周三/, offset: (10 - now.getDay()) % 7 + 1 },
    { regex: /下周四/, offset: (11 - now.getDay()) % 7 + 1 },
    { regex: /下周五/, offset: (12 - now.getDay()) % 7 + 1 },
    { regex: /下周六/, offset: (13 - now.getDay()) % 7 + 1 },
    { regex: /下周日|下周天/, offset: (14 - now.getDay()) % 7 + 1 },
    { regex: /这周五|本周五/, offset: (5 - now.getDay() + 7) % 7 || 7 },
  ];

  let dateOffset = null;
  for (const p of patterns) {
    if (p.regex.test(text)) { dateOffset = p.offset; break; }
  }

  // 提取小时
  let hour = null;
  const timePatterns = [
    { regex: /早上(\d+)点|上午(\d+)点/, fn: m => parseInt(m[1]||m[2]) },
    { regex: /中午(\d+)点?/, fn: m => parseInt(m[1]) === 12 ? 12 : parseInt(m[1]) + 12 },
    { regex: /下午(\d+)点/, fn: m => parseInt(m[1]) + 12 },
    { regex: /晚上(\d+)点|傍晚(\d+)点/, fn: m => parseInt(m[1]||m[2]) + 12 },
    { regex: /(\d+)[:：](\d+)/, fn: m => parseInt(m[1]) },
    { regex: /(\d+)点/, fn: m => parseInt(m[1]) },
  ];
  for (const tp of timePatterns) {
    const m = text.match(tp.regex);
    if (m) { hour = tp.fn(m); break; }
  }

  if (dateOffset === null) return { hasTime: false, deadline: "" };

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + dateOffset);
  if (hour !== null) targetDate.setHours(hour, 0, 0, 0);

  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const hh = hour !== null ? ` ${String(targetDate.getHours()).padStart(2,'0')}:00` : '';

  return { hasTime: true, deadline: `${yyyy}-${mm}-${dd}${hh}` };
}

// 自测（开发完删除）
const tests = ["明天下午3点开会", "下周五提交", "今天晚上8点", "随便记一条"];
tests.forEach(t => console.log(t, '->', JSON.stringify(parseDateFromText(t))));
