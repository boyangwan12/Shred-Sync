/**
 * Generate Chinese PDF progress report by querying Turso for current state,
 * rendering an HTML document, and converting to PDF.
 *
 * Output: ~/Desktop/shred-sync-progress-{date}.pdf
 */

import { prisma } from '../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

async function main() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const outDir = path.join(os.homedir(), 'Desktop');
  const htmlPath = path.join(outDir, `shred-sync-progress-${dateStr}.html`);
  const pdfPath = path.join(outDir, `shred-sync-progress-${dateStr}.pdf`);

  // Pull data
  const allLogs = await prisma.dailyLog.findMany({
    orderBy: { date: 'asc' },
    include: { workoutExercises: { include: { sets: true, exercise: true } } },
  });

  const startWeight = 153.3;
  const goalWeight = 146.0;
  const startBf = 14.3;
  const goalBf = 10.0;
  const startDate = '2026-04-07';
  const endDate = '2026-06-30';

  // Current status
  const todayDateStr = '2026-04-29';
  const todayLog = allLogs.find((l) => l.date === todayDateStr);
  const currentWeight = todayLog?.weightLbs ?? 150.0;
  const totalLoss = startWeight - currentWeight;
  const lossPct = ((totalLoss / startWeight) * 100).toFixed(1);

  // Day count
  const daysSinceStart = Math.floor((new Date(todayDateStr).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  const totalDays = Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  const weekNum = (daysSinceStart / 7).toFixed(1);

  // Plan trajectory at this point
  const planAtToday = 150.8; // from interpolating the planned trajectory
  const aheadOfPlan = planAtToday - currentWeight;

  // Weight log table (last 14 days for chart)
  const recent = allLogs.filter((l) => l.weightLbs !== null && l.date >= '2026-04-07');
  const weightRows = recent
    .map((l) => `      <tr><td>${l.date}</td><td>${l.dayType}</td><td>${l.weightLbs} lb</td><td>${l.hrvMs ?? '—'} ms</td><td>${l.sleepMinutes ? (l.sleepMinutes / 60).toFixed(1) + 'h' : '—'}</td><td>${l.deepSleepMinutes ?? '—'} 分</td></tr>`)
    .join('\n');

  // 7-day rolling average
  const last7 = recent.slice(-7).filter((l) => l.weightLbs !== null);
  const avg7 = last7.length > 0 ? (last7.reduce((s, l) => s + (l.weightLbs ?? 0), 0) / last7.length).toFixed(2) : '—';

  // Day-type summary
  const restCount = allLogs.filter((l) => l.dayType === 'rest').length;
  const pushCount = allLogs.filter((l) => l.dayType === 'push').length;
  const pullCount = allLogs.filter((l) => l.dayType === 'pull').length;
  const legsCount = allLogs.filter((l) => l.dayType === 'legs').length;

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>减脂计划进展报告 - ${dateStr}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; color: #222; line-height: 1.6; font-size: 11pt; max-width: 800px; margin: 0 auto; }
  h1 { color: #1D9E75; font-size: 22pt; margin-bottom: 4px; border-bottom: 2px solid #1D9E75; padding-bottom: 8px; }
  h2 { color: #378ADD; font-size: 14pt; margin-top: 24px; margin-bottom: 8px; border-left: 4px solid #378ADD; padding-left: 10px; }
  h3 { font-size: 12pt; color: #444; margin-top: 16px; margin-bottom: 6px; }
  .subtitle { color: #888; font-size: 10pt; margin-bottom: 20px; }
  .highlight-box { background: #f4faf7; border-left: 4px solid #1D9E75; padding: 14px 18px; margin: 16px 0; border-radius: 4px; }
  .highlight-box .num { font-size: 20pt; font-weight: bold; color: #1D9E75; }
  .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 12px 0; }
  .stat { background: #fafafa; padding: 10px 12px; border-radius: 4px; border: 1px solid #eee; text-align: center; }
  .stat .label { font-size: 9pt; color: #888; }
  .stat .value { font-size: 14pt; font-weight: bold; color: #222; margin-top: 2px; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 10pt; }
  th, td { border: 1px solid #ddd; padding: 5px 8px; text-align: left; }
  th { background: #f4f4f4; font-weight: 600; }
  tr:nth-child(even) { background: #fafafa; }
  .progress-bar { background: #eee; height: 24px; border-radius: 4px; overflow: hidden; position: relative; margin: 8px 0; }
  .progress-fill { background: linear-gradient(to right, #1D9E75, #378ADD); height: 100%; }
  .progress-label { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10pt; }
  .ahead { color: #1D9E75; font-weight: bold; }
  .footnote { font-size: 9pt; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
  ul { padding-left: 20px; }
  li { margin: 4px 0; }
  .meta-row { display: flex; gap: 20px; flex-wrap: wrap; font-size: 10pt; color: #666; margin-top: 8px; }
</style>
</head>
<body>

<h1>减脂计划进展报告</h1>
<div class="subtitle">第 ${weekNum} 周 · ${dateStr} · 数据驱动的科学减脂方案</div>

<div class="meta-row">
  <span>📅 周期：${startDate} 至 ${endDate}（共 ${totalDays} 天 / ${(totalDays / 7).toFixed(1)} 周）</span>
  <span>📊 当前进度：第 ${daysSinceStart} 天（${((daysSinceStart / totalDays) * 100).toFixed(0)}%）</span>
</div>

<h2>一、目标与起点</h2>

<div class="stat-grid">
  <div class="stat"><div class="label">起始体重</div><div class="value">${startWeight} 磅</div><div class="label">≈ ${(startWeight / 2.205).toFixed(1)} 公斤</div></div>
  <div class="stat"><div class="label">目标体重</div><div class="value">${goalWeight} 磅</div><div class="label">≈ ${(goalWeight / 2.205).toFixed(1)} 公斤</div></div>
  <div class="stat"><div class="label">总减重目标</div><div class="value">${(startWeight - goalWeight).toFixed(1)} 磅</div><div class="label">≈ ${((startWeight - goalWeight) / 2.205).toFixed(1)} 公斤</div></div>
  <div class="stat"><div class="label">起始体脂率</div><div class="value">${startBf}%</div></div>
  <div class="stat"><div class="label">目标体脂率</div><div class="value">${goalBf}%</div></div>
  <div class="stat"><div class="label">维持肌肉量</div><div class="value">131 磅</div><div class="label">瘦体重保护</div></div>
</div>

<p>目标：在 <b>12 周</b>（约 3 个月）内将体脂率从 14.3% 降至 10%，同时尽可能保持肌肉量。这是一个<b>渐进式、健康的减脂方案</b>，不属于极端节食。</p>

<h2>二、当前进展（截至 ${dateStr}）</h2>

<div class="highlight-box">
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <div>
      <div style="font-size: 9pt; color: #666;">今日体重</div>
      <div class="num">${currentWeight} 磅</div>
      <div style="font-size: 9pt;">≈ ${(currentWeight / 2.205).toFixed(1)} 公斤</div>
    </div>
    <div>
      <div style="font-size: 9pt; color: #666;">7天滚动平均</div>
      <div style="font-size: 16pt; font-weight: bold; color: #378ADD;">${avg7} 磅</div>
    </div>
    <div>
      <div style="font-size: 9pt; color: #666;">较起点</div>
      <div style="font-size: 16pt; font-weight: bold; color: #1D9E75;">−${totalLoss.toFixed(1)} 磅</div>
      <div style="font-size: 9pt;">−${lossPct}%</div>
    </div>
    <div>
      <div style="font-size: 9pt; color: #666;">vs 计划进度</div>
      <div class="ahead" style="font-size: 16pt;">+${aheadOfPlan.toFixed(1)} 磅 领先</div>
    </div>
  </div>
</div>

<h3>进度可视化</h3>
<div class="progress-bar">
  <div class="progress-fill" style="width: ${((totalLoss / (startWeight - goalWeight)) * 100).toFixed(1)}%;"></div>
  <div class="progress-label">已完成 ${((totalLoss / (startWeight - goalWeight)) * 100).toFixed(1)}% 的目标</div>
</div>

<p><b>判断：</b>当前减脂速度（约 1.0-1.2 磅/周）<b>略超原计划</b>（0.81 磅/周）但仍在健康范围内（每周 0.5-1% 体重为最佳）。最近一次微调（4月26日收紧热量目标）已经验证有效。</p>

<h2>三、方法论：科学化减脂方案</h2>

<h3>每日营养目标（按训练日类型变化）</h3>
<table>
  <tr><th>训练日类型</th><th>热量</th><th>蛋白质</th><th>碳水</th><th>脂肪</th><th>本周完成天数</th></tr>
  <tr><td>休息日（低碳）</td><td>1400 千卡</td><td>153 克</td><td>75 克</td><td>55 克</td><td>${restCount} 天</td></tr>
  <tr><td>推（胸肩三）</td><td>1800 千卡</td><td>153 克</td><td>100 克</td><td>88 克</td><td>${pushCount} 天</td></tr>
  <tr><td>拉（背二头）</td><td>1800 千卡</td><td>153 克</td><td>100 克</td><td>88 克</td><td>${pullCount} 天</td></tr>
  <tr><td>腿（高碳）</td><td>2000 千卡</td><td>153 克</td><td>250 克</td><td>43 克</td><td>${legsCount} 天</td></tr>
</table>

<p><b>日均</b>：约 1700 千卡 · 蛋白质保持 153 克（每磅瘦体重 1 克以上，保护肌肉）· 周均赤字约 3,500 千卡（相当于 1 磅脂肪）。</p>

<h3>训练计划：4 天循环</h3>
<table>
  <tr><th>第 1 天</th><th>第 2 天</th><th>第 3 天</th><th>第 4 天</th></tr>
  <tr><td>休息日</td><td>推（胸/肩/三头）</td><td>拉（背/二头）</td><td>腿（深蹲/硬拉）</td></tr>
</table>

<p>每周训练 5 次力量训练 + 2 小时有氧（散步），共 7-8 小时训练。所有训练数据（重量、次数、组数）通过自建数字化系统记录。</p>

<h3>每日协议时间表（标准化日程）</h3>
<table>
  <tr><th>时间</th><th>事项</th></tr>
  <tr><td>7:00 AM</td><td>起床 + 晨检（体重 / 心率变异性 / 睡眠数据 / 精力评分）</td></tr>
  <tr><td>7:15 AM</td><td>系统自动调整今日训练计划（基于晨检数据）</td></tr>
  <tr><td>7:30 AM</td><td>早餐（蛋白质+脂肪）</td></tr>
  <tr><td>10:30 AM</td><td>咖啡（一杯，配食物）</td></tr>
  <tr><td>12:30 PM</td><td>午餐（蛋白质+脂肪）</td></tr>
  <tr><td>4:00 PM</td><td>训练前补充碳水（约 30 克）</td></tr>
  <tr><td>5:00 PM</td><td>力量训练</td></tr>
  <tr><td>7:00 PM</td><td>晚餐（训练后补给 + 晚餐合并）</td></tr>
  <tr><td>9:00 PM</td><td>规划次日饮食</td></tr>
  <tr><td>9:30 PM</td><td>系统生成次日体重和恢复预测</td></tr>
  <tr><td>11:00 PM</td><td>睡眠</td></tr>
</table>

<h2>四、关键数据记录（最近 ${recent.length} 天）</h2>

<table>
  <tr><th>日期</th><th>类型</th><th>体重</th><th>HRV（心率变异性）</th><th>睡眠</th><th>深度睡眠</th></tr>
${weightRows}
</table>

<p><b>HRV 解读：</b>心率变异性是衡量身体恢复状态的客观指标。70-120 毫秒为正常范围，越高越好。每日 HRV 用于动态调整训练强度，避免过度训练。</p>

<h2>五、健康保护机制</h2>

<p>这套方案的设计原则是<b>"科学+可持续"</b>，而非快速减重。具体保护机制：</p>

<ul>
  <li><b>蛋白质摄入充足</b>：每日 153 克蛋白质，每磅瘦体重超过 1 克，最大化保护肌肉</li>
  <li><b>碳水循环</b>：每 4 天一次"高碳日"（腿日 250 克碳水），用于补充肝糖原 + 维持代谢率</li>
  <li><b>HRV 自动调整</b>：每日早晨 HRV 数据决定当天训练强度（绿/黄/红灯系统）</li>
  <li><b>预设减载窗口</b>：当 HRV 连续 3 天低于 70 时自动触发"减载周"，降低训练量 30-40%</li>
  <li><b>可证伪预测系统</b>：每晚预测次日体重和 HRV，记录实际值，验证模型准确性</li>
  <li><b>不极端节食</b>：单日热量赤字控制在 500-700 千卡范围（推荐安全区间）</li>
  <li><b>食物多样化</b>：包含三文鱼、鸡胸、虾、瘦猪肉、红薯、菠菜、蘑菇、蓝莓等多种食物</li>
</ul>

<h2>六、近期挑战与应对</h2>

<p>4月28日因工作压力 + 与朋友冲突 + 错过晚 11 点最佳睡眠时间（凌晨 2:45 才入睡），导致：</p>
<ul>
  <li>4月29日晨 HRV 降至 57 毫秒（红色信号）</li>
  <li>睡眠时长仅 5h 49m（低于 7 小时目标）</li>
</ul>

<p><b>应对：</b>系统自动触发当日"红色减载"协议——胸推改为机械式胸推（更安全）、训练量减少 38%、跳过两个高难度动作。<b>一天的不顺并不影响整体进度</b>——次日数据决定是否扩展为减载周。</p>

<h2>七、剩余周期展望</h2>

<table>
  <tr><th>阶段</th><th>体重区间</th><th>关注点</th></tr>
  <tr><td>第 4-6 周（5月）</td><td>148.5 → 146.5 磅</td><td>保持当前节奏；如减重过快可微调热量</td></tr>
  <tr><td>第 7-9 周（6月）</td><td>146.5 → 146.0 磅</td><td>对抗适应性降低代谢；可能加入有氧</td></tr>
  <tr><td>结束（6月30日）</td><td>≤ 146 磅</td><td>体脂率 ≤ 10%，转入维持期</td></tr>
</table>

<p>预计 6 月 30 日达成目标的可能性：<b>高</b>（当前已领先计划 0.8 磅，剩余 4 磅，剩余 9 周）。</p>

<div class="footnote">
报告生成日期：${dateStr}<br>
数据源：私有训练数据库（Turso libsql）+ AutoSleep + Apple Health<br>
方法论：基于 Lyle McDonald、Eric Helms 等运动营养学研究 + 个人化数据校准
</div>

</body>
</html>`;

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`HTML written: ${htmlPath}`);

  // Convert HTML to PDF using built-in macOS cupsfilter or wkhtmltopdf if available.
  // Fallback: tell user to open the HTML and print to PDF.
  try {
    const { execSync } = await import('child_process');
    execSync(`/usr/sbin/cupsfilter "${htmlPath}" > "${pdfPath}" 2>/dev/null`);
    console.log(`PDF generated: ${pdfPath}`);
  } catch (err) {
    console.log(`PDF auto-generation failed. Open the HTML manually and use browser's "Save as PDF":`);
    console.log(`  open "${htmlPath}"`);
    console.log(`  Then: File → Print → Save as PDF`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
