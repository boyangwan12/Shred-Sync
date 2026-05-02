/**
 * Comprehensive Chinese-only progress report with charts.
 * Uses Chart.js via CDN, rendered to PDF via Chrome headless (--virtual-time-budget).
 */

import { prisma } from '../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

async function main() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const outDir = path.join(os.homedir(), 'Desktop');
  const htmlPath = path.join(outDir, `减脂报告-${dateStr}.html`);
  const pdfPath = path.join(outDir, `减脂报告-${dateStr}.pdf`);

  // === Pull data ===
  const allLogs = await prisma.dailyLog.findMany({
    orderBy: { date: 'asc' },
    include: {
      foodItems: { orderBy: { sortOrder: 'asc' } },
      workoutExercises: {
        orderBy: { sortOrder: 'asc' },
        include: { exercise: true, sets: { orderBy: { setNumber: 'asc' } } },
      },
    },
  });

  const startWeight = 153.3;
  const goalWeight = 146.0;
  const startDate = '2026-04-07';
  const endDate = '2026-06-30';
  const todayDateStr = '2026-04-29';
  const todayLog = allLogs.find((l) => l.date === todayDateStr);
  const currentWeight = todayLog?.weightLbs ?? 150.0;
  const totalLoss = startWeight - currentWeight;

  const daysSinceStart = Math.floor((new Date(todayDateStr).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  const totalDays = Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  const weekNum = (daysSinceStart / 7).toFixed(1);

  // Logs with weight (chronological)
  const weightLogs = allLogs.filter((l) => l.weightLbs !== null);
  const dates = weightLogs.map((l) => l.date);
  const weights = weightLogs.map((l) => l.weightLbs!);

  // 7-day rolling
  const rolling7: (number | null)[] = weightLogs.map((l, idx) => {
    if (l.weightLbs === null) return null;
    const cutoffMs = new Date(l.date + 'T00:00:00').getTime() - 6 * 86400000;
    const window: number[] = [];
    for (let i = 0; i <= idx; i++) {
      const t = new Date(weightLogs[i].date + 'T00:00:00').getTime();
      if (t >= cutoffMs && weightLogs[i].weightLbs !== null) window.push(weightLogs[i].weightLbs!);
    }
    return window.length >= 3 ? parseFloat((window.reduce((s, v) => s + v, 0) / window.length).toFixed(2)) : null;
  });

  // Plan trajectory (linear interpolation)
  const planTrajectory: number[] = dates.map((d) => {
    const dms = new Date(d + 'T00:00:00').getTime();
    const t0 = new Date(startDate + 'T00:00:00').getTime();
    const t1 = new Date(endDate + 'T00:00:00').getTime();
    const pct = (dms - t0) / (t1 - t0);
    return parseFloat((startWeight + pct * (goalWeight - startWeight)).toFixed(2));
  });

  // HRV trend
  const hrvLogs = allLogs.filter((l) => l.hrvMs !== null);
  const hrvDates = hrvLogs.map((l) => l.date);
  const hrvValues = hrvLogs.map((l) => l.hrvMs!);

  // Sleep + deep sleep
  const sleepLogs = allLogs.filter((l) => l.sleepMinutes !== null);
  const sleepDates = sleepLogs.map((l) => l.date);
  const sleepHours = sleepLogs.map((l) => parseFloat(((l.sleepMinutes ?? 0) / 60).toFixed(2)));
  const deepSleepMin = sleepLogs.map((l) => l.deepSleepMinutes ?? 0);

  // Macros (actuals where available)
  const macroLogs = allLogs.filter((l) => l.caloriesActual !== null);
  const macroDates = macroLogs.map((l) => l.date);
  const macroCalories = macroLogs.map((l) => l.caloriesActual!);
  const macroProtein = macroLogs.map((l) => Math.round(l.proteinActual ?? 0));
  const macroCarbs = macroLogs.map((l) => Math.round(l.carbsActual ?? 0));
  const macroFat = macroLogs.map((l) => Math.round(l.fatActual ?? 0));

  // Glycogen
  const glycogenLogs = allLogs.filter((l) => l.muscleGlycogenPct !== null || l.liverGlycogenPct !== null);
  const glycogenDates = glycogenLogs.map((l) => l.date);
  const muscleGlycogen = glycogenLogs.map((l) => l.muscleGlycogenPct ?? null);
  const liverGlycogen = glycogenLogs.map((l) => l.liverGlycogenPct ?? null);

  // Training volume per session
  const trainingLogs = allLogs.filter((l) => l.workoutExercises.length > 0 && l.dayType !== 'rest');
  const trainingData = trainingLogs.map((l) => {
    let vol = 0;
    let workingSets = 0;
    for (const we of l.workoutExercises) {
      for (const s of we.sets) {
        if (s.isWarmup) continue;
        if (typeof s.weightLbs !== 'number' || typeof s.reps !== 'number') continue;
        const eff = s.isPerSide ? s.weightLbs * 2 : s.weightLbs;
        vol += eff * s.reps;
        workingSets += 1;
      }
    }
    return { date: l.date, dayType: l.dayType, volume: vol, sets: workingSets };
  });

  // Day type distribution
  const dayTypeCounts = {
    rest: allLogs.filter((l) => l.dayType === 'rest').length,
    push: allLogs.filter((l) => l.dayType === 'push').length,
    pull: allLogs.filter((l) => l.dayType === 'pull').length,
    legs: allLogs.filter((l) => l.dayType === 'legs').length,
  };

  // Recent food logs (last 7 days with food items)
  const recentFoodDays = allLogs.filter((l) => l.foodItems.length > 0).slice(-7);
  const recentFoodHtml = recentFoodDays.map((l) => {
    const items = l.foodItems.map((i) => `<tr><td>${i.name}</td><td>${i.quantity ?? '—'}</td><td>${i.proteinG ?? 0}</td><td>${i.carbsG ?? 0}</td><td>${i.fatG ?? 0}</td><td>${i.calories ?? 0}</td></tr>`).join('');
    return `<h4>${l.date}（${zhDayType(l.dayType)}）</h4><table class="food-table"><tr><th>食物</th><th>份量</th><th>蛋白</th><th>碳水</th><th>脂肪</th><th>热量</th></tr>${items}</table>`;
  }).join('');

  // Recent training logs
  const recentTrainingDays = trainingLogs.slice(-5);
  const recentTrainingHtml = recentTrainingDays.map((l) => {
    const exercises = l.workoutExercises.map((we) => {
      const working = we.sets.filter((s) => !s.isWarmup);
      const summary = working.map((s) => {
        const w = s.weightLbs ?? 'BW';
        const ps = s.isPerSide ? '/边' : '';
        return `${w}${ps}×${s.reps}`;
      }).join('、');
      return `<tr><td>${zhExerciseName(we.exercise.name)}</td><td>${summary}</td></tr>`;
    }).join('');
    return `<h4>${l.date}（${zhDayType(l.dayType)}）</h4><table class="train-table"><tr><th>动作</th><th>组数</th></tr>${exercises}</table>`;
  }).join('');

  // === Build HTML ===
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>减脂计划进展报告 - ${dateStr}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; color: #1f2937; line-height: 1.65; font-size: 11pt; max-width: 800px; margin: 0 auto; }
  h1 { color: #1D9E75; font-size: 24pt; margin-bottom: 4px; border-bottom: 3px solid #1D9E75; padding-bottom: 10px; }
  h2 { color: #378ADD; font-size: 16pt; margin-top: 28px; margin-bottom: 10px; border-left: 5px solid #378ADD; padding-left: 12px; page-break-after: avoid; }
  h3 { font-size: 13pt; color: #1f2937; margin-top: 18px; margin-bottom: 8px; page-break-after: avoid; }
  h4 { font-size: 11pt; color: #555; margin-top: 14px; margin-bottom: 4px; }
  .subtitle { color: #6b7280; font-size: 10pt; margin-bottom: 22px; }
  .highlight-box { background: #f0fdf4; border-left: 5px solid #1D9E75; padding: 16px 20px; margin: 18px 0; border-radius: 6px; page-break-inside: avoid; }
  .highlight-box .num { font-size: 22pt; font-weight: bold; color: #1D9E75; }
  .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 14px 0; }
  .stat { background: #f9fafb; padding: 12px 14px; border-radius: 6px; border: 1px solid #e5e7eb; text-align: center; }
  .stat .label { font-size: 9pt; color: #6b7280; }
  .stat .value { font-size: 16pt; font-weight: bold; color: #1f2937; margin-top: 4px; }
  .stat .sublabel { font-size: 8.5pt; color: #9ca3af; margin-top: 2px; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 10pt; page-break-inside: auto; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; color: #374151; }
  tr:nth-child(even) { background: #fafafa; }
  .food-table th, .food-table td, .train-table th, .train-table td { font-size: 9.5pt; padding: 4px 6px; }
  .progress-bar { background: #e5e7eb; height: 28px; border-radius: 6px; overflow: hidden; position: relative; margin: 10px 0; }
  .progress-fill { background: linear-gradient(to right, #1D9E75, #378ADD); height: 100%; }
  .progress-label { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11pt; }
  .ahead { color: #1D9E75; font-weight: bold; }
  .footnote { font-size: 9pt; color: #9ca3af; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
  ul { padding-left: 22px; }
  li { margin: 5px 0; }
  .chart-container { width: 100%; margin: 12px 0; page-break-inside: avoid; background: #fff; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; }
  .chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
  .meta-row { display: flex; gap: 20px; flex-wrap: wrap; font-size: 10pt; color: #6b7280; margin-top: 8px; }
  .page-break { page-break-after: always; }
  .key-finding { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 12px 0; border-radius: 4px; font-size: 10.5pt; }
</style>
</head>
<body>

<h1>减脂计划进展报告</h1>
<div class="subtitle">第 ${weekNum} 周 · ${dateStr} · 数据驱动的科学减脂方案</div>
<div class="meta-row">
  <span>📅 周期：${startDate} 至 ${endDate}（共 ${totalDays} 天 / ${(totalDays / 7).toFixed(1)} 周）</span>
  <span>📊 当前进度：第 ${daysSinceStart} 天（${((daysSinceStart / totalDays) * 100).toFixed(0)}%）</span>
</div>

<h2>第一部分：执行摘要</h2>

<div class="highlight-box">
  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
    <div>
      <div style="font-size: 9pt; color: #6b7280;">今日体重</div>
      <div class="num">${currentWeight} 磅</div>
      <div style="font-size: 9pt;">≈ ${(currentWeight / 2.205).toFixed(1)} 公斤</div>
    </div>
    <div>
      <div style="font-size: 9pt; color: #6b7280;">较起点减重</div>
      <div style="font-size: 18pt; font-weight: bold; color: #1D9E75;">−${totalLoss.toFixed(1)} 磅</div>
      <div style="font-size: 9pt;">−${((totalLoss / startWeight) * 100).toFixed(1)}%</div>
    </div>
    <div>
      <div style="font-size: 9pt; color: #6b7280;">7天滚动平均</div>
      <div style="font-size: 18pt; font-weight: bold; color: #378ADD;">${rolling7[rolling7.length - 1] ?? '—'} 磅</div>
    </div>
    <div>
      <div style="font-size: 9pt; color: #6b7280;">距离目标</div>
      <div style="font-size: 18pt; font-weight: bold; color: #f59e0b;">${(currentWeight - goalWeight).toFixed(1)} 磅</div>
    </div>
  </div>
</div>

<h3>目标完成进度</h3>
<div class="progress-bar">
  <div class="progress-fill" style="width: ${((totalLoss / (startWeight - goalWeight)) * 100).toFixed(1)}%;"></div>
  <div class="progress-label">已完成 ${((totalLoss / (startWeight - goalWeight)) * 100).toFixed(1)}%</div>
</div>

<div class="key-finding">
<b>关键发现：</b>当前减脂速度约为 1.0-1.2 磅/周，<b>略超原计划</b>（0.81 磅/周）但仍处于运动营养学公认的健康范围（每周减重 0.5-1% 体重）。最近一次微调（4月26日收紧热量目标）已经验证有效。
</div>

<h2>第二部分：减重轨迹分析</h2>

<h3>每日体重 + 7日滚动平均 + 计划轨迹</h3>
<div class="chart-container"><canvas id="chartWeight" height="80"></canvas></div>
<p style="font-size: 9.5pt; color: #6b7280;">蓝线为每日体重原始数据（含正常波动），橙色线为 7 日滚动平均（去除水分/食物残留噪音，反映真实趋势），灰色虚线为计划轨迹。</p>

<h3>关键里程碑</h3>
<table>
  <tr><th>日期</th><th>体重</th><th>事件</th></tr>
  <tr><td>2026-04-07</td><td>153.3 磅</td><td>开始</td></tr>
  <tr><td>2026-04-13</td><td>154.8 磅</td><td>初期水分波动峰值</td></tr>
  <tr><td>2026-04-26</td><td>—</td><td>收紧热量目标（每天减少 100 千卡）</td></tr>
  <tr><td>2026-04-28</td><td>151.3 磅</td><td>突破 152 磅心理关口</td></tr>
  <tr><td>2026-04-29</td><td>${currentWeight} 磅</td><td>当前 · 比计划领先 0.8 磅</td></tr>
</table>

<h2>第三部分：身体恢复指标 — 心率变异性（HRV）</h2>

<p>心率变异性（HRV，单位：毫秒）是衡量自主神经系统平衡和身体恢复状态的<b>客观医学指标</b>。HRV 越高，说明身体恢复越好、压力越低。也是<b>皮质醇水平</b>的间接反映（HRV 低 = 皮质醇高 = 身体在应激状态）。</p>

<div class="chart-container"><canvas id="chartHrv" height="70"></canvas></div>

<table>
  <tr><th>HRV 区间</th><th>含义</th><th>训练建议</th></tr>
  <tr><td style="color: #1D9E75; font-weight: bold;">≥120 毫秒</td><td>绿灯：完全恢复，可挑战 PR</td><td>正常推进 + 进步</td></tr>
  <tr><td style="color: #f59e0b; font-weight: bold;">70-119 毫秒</td><td>黄灯：基础恢复，匹配重量</td><td>不打 PR，维持现有水平</td></tr>
  <tr><td style="color: #ef4444; font-weight: bold;">&lt;70 毫秒</td><td>红灯：神经系统疲劳，需减载</td><td>降低重量 5-10%，跳过附加动作</td></tr>
</table>

<h2>第四部分：睡眠分析</h2>

<div class="chart-row">
  <div class="chart-container"><canvas id="chartSleep" height="120"></canvas></div>
  <div class="chart-container"><canvas id="chartDeep" height="120"></canvas></div>
</div>

<p>左图：每日总睡眠时长（小时）。右图：深度睡眠时长（分钟）。<br>
深度睡眠是恢复的关键阶段，期间生长激素分泌、组织修复、记忆巩固都在此发生。目标：<b>每晚 7-8 小时总睡眠，其中 90-150 分钟深睡。</b></p>

<h2>第五部分：营养摄入</h2>

<h3>每日宏量营养素摄入（克）</h3>
<div class="chart-container"><canvas id="chartMacros" height="100"></canvas></div>

<h3>每日热量摄入（千卡）</h3>
<div class="chart-container"><canvas id="chartCalories" height="80"></canvas></div>

<h3>训练日类型分布</h3>
<div class="chart-row">
  <div class="chart-container"><canvas id="chartDayType" height="160"></canvas></div>
  <div>
    <table style="margin-top: 20px;">
      <tr><th>类型</th><th>天数</th><th>每日热量</th><th>蛋白质</th><th>碳水</th><th>脂肪</th></tr>
      <tr><td>休息日</td><td>${dayTypeCounts.rest}</td><td>1400</td><td>153</td><td>75</td><td>55</td></tr>
      <tr><td>推日（胸肩三）</td><td>${dayTypeCounts.push}</td><td>1800</td><td>153</td><td>100</td><td>88</td></tr>
      <tr><td>拉日（背二头）</td><td>${dayTypeCounts.pull}</td><td>1800</td><td>153</td><td>100</td><td>88</td></tr>
      <tr><td>腿日（高碳）</td><td>${dayTypeCounts.legs}</td><td>2000</td><td>153</td><td>250</td><td>43</td></tr>
    </table>
    <p style="font-size: 9pt; color: #6b7280; margin-top: 8px;">每 4 天循环一次：休 → 推 → 拉 → 腿。</p>
  </div>
</div>

<h2>第六部分：肌肉糖原与代谢储备</h2>

<p>糖原是肌肉和肝脏储存的碳水化合物形式，直接影响训练表现和体重读数：</p>
<ul>
  <li><b>肝糖原</b>（容量约 80-110 克）：维持血糖，禁食时大脑燃料来源</li>
  <li><b>肌肉糖原</b>（容量约 400 克）：训练能量，每克结合 3-4 克水</li>
  <li>每次腿日的"高碳refeed"会恢复肌糖原 + 暂时增加 1-2 磅水分（这不是脂肪！）</li>
</ul>

<div class="chart-container"><canvas id="chartGlycogen" height="80"></canvas></div>

<h2>第七部分：训练记录</h2>

<h3>每次训练的总训练量（磅×次数）</h3>
<div class="chart-container"><canvas id="chartVolume" height="80"></canvas></div>

<h3>近 5 次训练详细记录</h3>
${recentTrainingHtml}

<h2>第八部分：详细饮食日志（近 7 天）</h2>

${recentFoodHtml}

<h2>第九部分：方法论与原则</h2>

<h3>每日协议时间表</h3>
<table>
  <tr><th>时间</th><th>事项</th><th>方式</th></tr>
  <tr><td>7:00 AM</td><td>晨检（体重、心率变异性、睡眠、精力）</td><td>手机推送提醒</td></tr>
  <tr><td>7:15 AM</td><td>系统自动调整今日训练计划</td><td>自动（无需用户输入）</td></tr>
  <tr><td>7:30 AM</td><td>早餐（蛋白质 + 脂肪）</td><td>预设方案</td></tr>
  <tr><td>10:30 AM</td><td>咖啡（一杯，配食物）</td><td>固定习惯</td></tr>
  <tr><td>12:30 PM</td><td>午餐（蛋白质 + 脂肪）</td><td>预设方案</td></tr>
  <tr><td>4:00 PM</td><td>训练前补充碳水（约 30 克）</td><td>提前 60 分钟</td></tr>
  <tr><td>5:00 PM</td><td>力量训练（45-90 分钟）</td><td>遵循当日方案</td></tr>
  <tr><td>7:00 PM</td><td>晚餐（训练后补给 + 晚餐合并）</td><td>预设方案</td></tr>
  <tr><td>9:00 PM</td><td>规划次日饮食 + 当日复盘</td><td>用户输入食材</td></tr>
  <tr><td>9:30 PM</td><td>系统生成次日预测（体重、HRV、睡眠）</td><td>自动</td></tr>
  <tr><td>11:00 PM</td><td>就寝</td><td>固定时间</td></tr>
</table>

<h3>七大健康保护机制</h3>
<ol>
  <li><b>蛋白质摄入充足</b>：每日 153 克蛋白质（每磅瘦体重超过 1 克），最大化保护肌肉</li>
  <li><b>碳水循环</b>：每 4 天一次"高碳日"（腿日 250 克碳水），用于补充糖原 + 维持代谢率</li>
  <li><b>HRV 自动调整</b>：每日 HRV 数据决定当天训练强度（绿/黄/红灯系统）</li>
  <li><b>预设减载窗口</b>：连续 3 天 HRV 低于 70 毫秒自动触发"减载周"</li>
  <li><b>可证伪预测系统</b>：每晚预测次日体重，验证模型准确性</li>
  <li><b>非极端节食</b>：单日热量赤字控制在 500-700 千卡（运动营养学公认安全区间）</li>
  <li><b>食物多样化</b>：包含三文鱼、鸡胸、虾、瘦猪肉、红薯、菠菜、蘑菇、坚果等</li>
</ol>

<h2>第十部分：近期挑战与应对</h2>

<div class="key-finding">
<b>4月28日事件：</b>因工作压力 + 与朋友冲突 + 错过晚 11 点最佳睡眠时间（凌晨 2:45 才入睡），导致 4月29日晨 HRV 降至 57 毫秒（红色信号），睡眠时长仅 5h 49m。
</div>

<p><b>系统应对：</b>当日自动触发"红色减载"协议——</p>
<ul>
  <li>胸推改为机械式胸推（更安全，神经系统压力更小）</li>
  <li>训练量减少 38%（从 24 个工作组降至 15 组）</li>
  <li>跳过两个高难度动作（绳索三头肌、80 磅卷腹）</li>
  <li>所有重量降低 10-17%</li>
</ul>

<p>这是<b>系统设计的预期行为</b>——一天的不顺是正常的生活波动，而非整体计划的失败。次日数据决定是否扩展为减载周。</p>

<h2>第十一部分：剩余周期展望</h2>

<table>
  <tr><th>阶段</th><th>体重区间</th><th>关注点</th></tr>
  <tr><td>第 4-6 周（5月）</td><td>148.5 → 146.5 磅</td><td>保持当前节奏；如减重过快可微调热量</td></tr>
  <tr><td>第 7-9 周（6月）</td><td>146.5 → 146.0 磅</td><td>对抗适应性降低代谢；可能加入有氧</td></tr>
  <tr><td>结束（6月30日）</td><td>≤ 146 磅 / ≤ 10% 体脂</td><td>转入维持期</td></tr>
</table>

<p>预计 6 月 30 日达成目标的可能性：<b>较高</b>。当前已领先计划 0.8 磅，剩余 4 磅，剩余 9 周。即使按当前实际节奏（约 1.0 磅/周）保守估算，也将在 6 月中下旬提前达成。</p>

<div class="footnote">
报告生成日期：${dateStr}<br>
数据源：私有训练数据库（Turso libsql）+ AutoSleep 应用 + Apple Health<br>
方法论参考：Lyle McDonald《减脂指南》、Eric Helms《肌肉与力量金字塔》、ISSN 营养立场<br>
所有数据均为本人真实记录，每日 7AM、7:15AM、4PM、9PM、9:30PM 五次自动检查节点
</div>

<script>
// === Render charts ===
const labelsW = ${JSON.stringify(dates)};
const dataW = ${JSON.stringify(weights)};
const dataR = ${JSON.stringify(rolling7)};
const dataP = ${JSON.stringify(planTrajectory)};
new Chart(document.getElementById('chartWeight'), {
  type: 'line',
  data: { labels: labelsW, datasets: [
    { label: '每日体重', data: dataW, borderColor: '#378ADD', backgroundColor: 'rgba(55,138,221,0.15)', fill: true, tension: 0.2, pointRadius: 3 },
    { label: '7日滚动平均', data: dataR, borderColor: '#EF9F27', backgroundColor: 'transparent', fill: false, tension: 0.4, pointRadius: 0, borderWidth: 2 },
    { label: '计划轨迹', data: dataP, borderColor: '#9ca3af', borderDash: [5,5], backgroundColor: 'transparent', fill: false, pointRadius: 0, borderWidth: 1.5 },
  ]},
  options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { title: { display: true, text: '体重（磅）' }, min: 144, max: 156 } } }
});

new Chart(document.getElementById('chartHrv'), {
  type: 'line',
  data: { labels: ${JSON.stringify(hrvDates)}, datasets: [{ label: 'HRV（毫秒）', data: ${JSON.stringify(hrvValues)}, borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.2)', fill: true, tension: 0.3 }] },
  options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { title: { display: true, text: 'HRV 心率变异性（毫秒）' }, beginAtZero: true } } }
});

new Chart(document.getElementById('chartSleep'), {
  type: 'bar',
  data: { labels: ${JSON.stringify(sleepDates)}, datasets: [{ label: '总睡眠（小时）', data: ${JSON.stringify(sleepHours)}, backgroundColor: '#378ADD' }] },
  options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { title: { display: true, text: '小时' }, beginAtZero: true, max: 10 } } }
});

new Chart(document.getElementById('chartDeep'), {
  type: 'bar',
  data: { labels: ${JSON.stringify(sleepDates)}, datasets: [{ label: '深睡（分钟）', data: ${JSON.stringify(deepSleepMin)}, backgroundColor: '#1D9E75' }] },
  options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { title: { display: true, text: '分钟' }, beginAtZero: true } } }
});

new Chart(document.getElementById('chartMacros'), {
  type: 'bar',
  data: { labels: ${JSON.stringify(macroDates)}, datasets: [
    { label: '蛋白质（克）', data: ${JSON.stringify(macroProtein)}, backgroundColor: '#1D9E75' },
    { label: '碳水（克）', data: ${JSON.stringify(macroCarbs)}, backgroundColor: '#EF9F27' },
    { label: '脂肪（克）', data: ${JSON.stringify(macroFat)}, backgroundColor: '#E24B4A' },
  ]},
  options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { x: { stacked: false }, y: { title: { display: true, text: '克' } } } }
});

new Chart(document.getElementById('chartCalories'), {
  type: 'line',
  data: { labels: ${JSON.stringify(macroDates)}, datasets: [{ label: '热量（千卡）', data: ${JSON.stringify(macroCalories)}, borderColor: '#E24B4A', backgroundColor: 'rgba(226,75,74,0.15)', fill: true, tension: 0.2 }] },
  options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { title: { display: true, text: '千卡' }, beginAtZero: false } } }
});

new Chart(document.getElementById('chartDayType'), {
  type: 'doughnut',
  data: { labels: ['休息日', '推日', '拉日', '腿日'], datasets: [{ data: [${dayTypeCounts.rest}, ${dayTypeCounts.push}, ${dayTypeCounts.pull}, ${dayTypeCounts.legs}], backgroundColor: ['#EF9F27', '#E24B4A', '#378ADD', '#1D9E75'] }] },
  options: { responsive: true, plugins: { legend: { position: 'right' } } }
});

new Chart(document.getElementById('chartGlycogen'), {
  type: 'line',
  data: { labels: ${JSON.stringify(glycogenDates)}, datasets: [
    { label: '肌糖原（%）', data: ${JSON.stringify(muscleGlycogen)}, borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.2)', fill: true, tension: 0.3 },
    { label: '肝糖原（%）', data: ${JSON.stringify(liverGlycogen)}, borderColor: '#EF9F27', backgroundColor: 'rgba(239,159,39,0.15)', fill: true, tension: 0.3 },
  ]},
  options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { title: { display: true, text: '糖原储备（%）' }, beginAtZero: true, max: 100 } } }
});

new Chart(document.getElementById('chartVolume'), {
  type: 'bar',
  data: { labels: ${JSON.stringify(trainingData.map((t) => t.date))}, datasets: [{ label: '总训练量（磅）', data: ${JSON.stringify(trainingData.map((t) => t.volume))}, backgroundColor: '#378ADD' }] },
  options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { title: { display: true, text: '总磅数' }, beginAtZero: true } } }
});
</script>

</body>
</html>`;

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`HTML written: ${htmlPath}`);
  console.log(`Size: ${(html.length / 1024).toFixed(1)} KB`);

  // Convert to PDF via Chrome with virtual-time-budget for chart rendering
  try {
    const { execSync } = await import('child_process');
    execSync(`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --no-pdf-header-footer --virtual-time-budget=15000 --print-to-pdf="${pdfPath}" "file://${htmlPath}" 2>&1`, { stdio: 'inherit' });
    console.log(`\nPDF generated: ${pdfPath}`);
  } catch (err) {
    console.log(`PDF auto-generation failed:`, (err as Error).message);
    console.log(`Open the HTML manually and use browser's "Save as PDF":`);
    console.log(`  open "${htmlPath}"`);
  }
}

function zhDayType(t: string): string {
  return t === 'rest' ? '休息日' : t === 'push' ? '推日' : t === 'pull' ? '拉日' : t === 'legs' ? '腿日' : t;
}

function zhExerciseName(name: string): string {
  const map: Record<string, string> = {
    'Bench Press': '杠铃卧推',
    'DB Incline': '哑铃上斜推',
    'Chest Fly Machine': '飞鸟机',
    'Chest Machine Incline': '上斜胸推机',
    'Shoulder Press Machine': '肩推机',
    'Cable Lateral Raise': '绳索侧平举',
    'Cable Triceps': '绳索三头',
    'Cable Crunch': '绳索卷腹',
    'Lat Pulldown Narrow': '窄握下拉',
    'Lat Pulldown Wide': '宽握下拉',
    'MTS Lat Pulldown': 'MTS 下拉',
    'MTS Row': 'MTS 划船',
    'Seated Row Narrow': '窄握坐姿划船',
    'Cable Lat Rotation': '绳索背阔旋转',
    'Cable Straight-Arm Pulldown': '直臂下压',
    'Cable Rear Delt': '绳索后束',
    'Barbell Curl': '杠铃弯举',
    'Cable Curl': '绳索弯举',
    'Hanging Leg Raise': '悬垂举腿',
    'Squat': '深蹲',
    'Belt Squat': '腰带深蹲',
    'Leg Press': '腿推',
    'Back Extension Machine': '背挺机',
    'Single Leg Extension': '单腿伸展',
    'Hip Adduction': '内收',
    'Dumbbell Row': '哑铃单臂划船',
    'Pull Up': '引体向上',
    'T-Bar Row': 'T 杠划船',
    'Cable Row': '绳索划船',
    'Barbell Shrug': '杠铃耸肩',
    'Smith Narrow Press': '史密斯窄推',
    'Decline Chest Press': '下斜胸推',
    'Cable Chest Fly': '绳索飞鸟',
    'Straight Arm Pulldown': '直臂下压',
  };
  return map[name] ?? name;
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
