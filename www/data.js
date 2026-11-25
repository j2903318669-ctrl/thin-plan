/* 薄计划 · 第一周数据
 * 说明：热量/蛋白质为外卖常见份量的估算值，实际会因油量、份量浮动 ±15%。
 * 训练视频均为公开跟练视频；动作质量优先，疼痛即停。
 */
const APP = {
  brand: '薄计划',
  subtitle: '12 周 · 减脂留线条',
  height: 170,
  startWeight: 75,
  targetWeight: 68,
  targetWaist: 80,
  baseCalories: 1800,
  baseProtein: 115,
  baseSteps: 8000,
  weeks: 12,

  principles: [
    '不追求“掉秤最快”，追求腰围下降、线条保留、能坚持 12 周。',
    '不主动“减肌肉”。肌肉是线条和代谢的本钱；看起来变薄，来自脂肪下降和体态变好。',
    '局部减脂不存在。双下巴和腰围一起靠全身脂肪下降；下颌线再加体态训练。',
    '第一周只建立节奏：6 天有安排（2 次力量 + 3 次有氧 + 1 次体态）、每天 8000 步、外卖按清单点。',
    '体重看 7 日均值，围度每 2 周量一次；单日波动 1–2kg 很正常。'
  ],

  posture: [
    { name: '收下巴', dose: '10 次 × 5 秒', cue: '后脑勺向后顶，不是低头；颈后拉长，肩膀放松。' },
    { name: '墙面天使', dose: '2 × 10', cue: '后脑勺、上背、臀贴墙；肋骨别外翻，手臂慢慢上下。' },
    { name: '门框胸肌拉伸', dose: '2 × 30 秒/侧', cue: '手肘略低于肩，身体轻轻前倾；不要憋气。' },
    { name: '颈侧拉伸', dose: '2 × 20 秒/侧', cue: '耳朵找肩膀，另一侧肩膀下沉；力度轻。' },
    { name: '舌面轻贴上颚', dose: '1 分钟', cue: '鼻呼吸，牙齿轻合。是姿势习惯，不是“燃脂动作”。' }
  ],

  postureNote: '双下巴主要是整体脂肪 + 下颌/颈前姿势 + 遗传。没有“局部瘦下巴”。把体脂降下来、头别前伸，线条会更清楚；不要用咬肌训练器，可能把脸练宽。',

  takeoutFormula: [
    '1.5 个掌心蛋白质：鸡胸、瘦牛肉、鱼、虾、鸡蛋、豆腐。',
    '2 个拳头蔬菜：绿叶菜、菌菇、瓜茄；能白灼/清炒就选它。',
    '0.5–1 个拳头主食：米饭半份、糙米、红薯、玉米、粉面半份。',
    '酱汁分装、少油少盐、不喝汤底；饮料只选水、无糖茶、黑咖啡。'
  ],

  avoid: [
    '奶茶、果汁、甜豆浆、零度以外的含糖饮料',
    '炸鸡、薯条、油条、酥皮点心、方便面',
    '干锅/香锅/红烧/糖醋/拔丝，以及“汤汁拌饭”',
    '麻酱、蛋黄酱、沙拉酱、芝士脆片、培根碎',
    '香肠、午餐肉、牛肉丸、炸腐竹等高油加工肉'
  ],

  swaps: [
    { name: '清汤麻辣烫', kcal: '500–650', protein: '35–45g', order: '清汤/番茄汤底；瘦牛肉+虾滑+豆腐+鹌鹑蛋；绿叶菜和菌菇加量；红薯粉一小份；不要麻酱、油条、方便面、午餐肉。' },
    { name: '鸡胸轻食碗', kcal: '500–600', protein: '40–50g', order: '鸡胸/牛肉双份；糙米或藜麦半份；蔬菜加量；酱汁单独放；不要芝士、脆片、培根碎。' },
    { name: '老乡鸡 / 中式快餐', kcal: '500–600', protein: '30–40g', order: '白切鸡/清蒸鸡/香菇鸡腿去皮；两份时蔬；米饭半份；不要红烧肉、梅菜扣肉、鸡油饭。' },
    { name: '麦当劳', kcal: '450–550', protein: '25–32g', order: '板烧鸡腿堡不要 mayo；玉米杯；零度可乐；不要薯条和炸鸡。' },
    { name: 'Subway', kcal: '400–500', protein: '35–45g', order: '6 寸全麦；鸡胸/火鸡胸双份；蔬菜全加；不要芝士和蛋黄酱；酱用芥末或红酒醋。' },
    { name: '潮汕牛肉火锅', kcal: '550–700', protein: '45–55g', order: '清汤锅；瘦牛肉 2 盘；豆腐、菌菇、绿叶菜；河粉一小份；沙茶酱少，蘸酱油+醋+蒜。' },
    { name: '日料', kcal: '500–650', protein: '35–45g', order: '刺身拼盘；寿司 6 件；海藻沙拉；味噌汤；不要天妇罗、美乃滋卷；酱油少。' },
    { name: '越南牛肉粉', kcal: '500–600', protein: '30–38g', order: '粉半份；牛肉加一份；豆芽/罗勒多；汤别喝完；不要春卷，辣椒酱少。' },
    { name: '清蒸鱼 / 酸菜鱼', kcal: '500–650', protein: '40–50g', order: '清蒸优先；酸菜鱼选少油少辣；鱼片多、配菜多；汤不喝；米饭半份。' },
    { name: '便利店组合', kcal: '450–550', protein: '30–40g', order: '即食鸡胸一份 + 关东煮（萝卜/海带/豆腐）+ 无糖酸奶 + 香蕉；不要饭团+奶茶组合。' }
  ],

  days: [
    {
      n: 1,
      weekday: '周一',
      tag: '力量 A',
      title: '全身力量 A',
      subtitle: '先把动作做对，不追求力竭',
      duration: 35,
      intensity: '低–中',
      burn: '约 150–220 kcal',
      video: {
        title: '帕梅拉 15 分钟新手全身（无器械）',
        platform: 'B 站',
        url: 'https://www.bilibili.com/video/BV1owaG6GEnh/',
        note: '跟练 1 遍；动作不熟可暂停。跳不动就把跳跃改成踏步。'
      },
      blocks: [
        { title: '热身', time: '5 分钟', items: ['原地踏步 2 分钟', '手臂绕环 30 秒 × 2', '髋铰链 10 次', '椅子深蹲 8 次'] },
        { title: '跟练', time: '15 分钟', items: ['帕梅拉 15 分钟新手全身', '跟不上就降速；不憋气'] },
        { title: '基础五式', time: '10 分钟', items: ['椅子深蹲 3 × 10', '斜板俯卧撑 3 × 8', '臀桥 3 × 12', '死虫 3 × 8/侧', '侧支撑 2 × 20 秒/侧'] },
        { title: '收尾', time: '5 分钟', items: ['慢走 2 分钟', '大腿前侧、臀部拉伸'] }
      ],
      steps: 8000,
      note: '每个动作留 2–3 次余力；第二天轻微酸可以练，尖锐疼痛就停。',
      meals: {
        breakfast: { name: '无糖豆浆 + 2 个茶叶蛋 + 玉米', kcal: 430, protein: 30, place: '早餐店/便利店', order: '豆浆不要加糖；茶叶蛋 2 个；玉米 1 根；不要油条和饼。' },
        lunch: { name: '鸡胸轻食碗', kcal: 550, protein: 43, place: '轻食店', order: '鸡胸肉双份；糙米/藜麦半份；蔬菜加量；酱汁单独放；不要培根碎、芝士、脆片。' },
        dinner: { name: '清汤麻辣烫', kcal: 600, protein: 40, place: '麻辣烫', order: '清汤/番茄汤底；瘦牛肉+虾滑+豆腐+鹌鹑蛋；绿叶菜和菌菇多点；红薯粉一小份；不要麻酱、油条、方便面、午餐肉，少油。' },
        snack: { name: '无糖希腊酸奶 + 蓝莓', kcal: 140, protein: 15, place: '便利店', order: '无糖希腊酸奶 150g；蓝莓一小盒；不要蜂蜜和果酱。' }
      }
    },
    {
      n: 2,
      weekday: '周二',
      tag: '低强度有氧',
      title: '20 分钟低难度有氧',
      subtitle: '能说话、但不能唱歌的强度',
      duration: 35,
      intensity: '低',
      burn: '约 120–160 kcal',
      video: {
        title: '周六野 20 分钟低难度有氧（大基数友好）',
        platform: 'B 站',
        url: 'https://www.bilibili.com/video/BV1Vt411Y7n1/',
        note: '全程站立、无工具；动作幅度小一点也有效。'
      },
      blocks: [
        { title: '热身', time: '3 分钟', items: ['原地踏步', '肩绕环', '踝关节活动'] },
        { title: '跟练', time: '20 分钟', items: ['周六野 20 分钟低难度有氧', '心率太高就放慢，保持能说短句'] },
        { title: '走路', time: '10 分钟', items: ['户外/走廊快走', '步频轻快，不要扶腰'] },
        { title: '收尾', time: '2 分钟', items: ['小腿、髋前侧拉伸'] }
      ],
      steps: 9000,
      note: '今天不跳。膝盖不舒服就改成原地踏步，仍然算完成。',
      meals: {
        breakfast: { name: '全麦鸡胸三明治 + 美式', kcal: 360, protein: 28, place: '咖啡店/便利店', order: '全麦面包；鸡胸肉；不要蛋黄酱和芝士；蔬菜多；酱分装；美式不加糖奶。' },
        lunch: { name: '老乡鸡：白切鸡 + 2 青菜 + 半饭', kcal: 550, protein: 39, place: '老乡鸡/中式快餐', order: '白切鸡或清蒸鸡，去皮；两份时蔬；米饭半份；不要红烧肉、梅菜扣肉、鸡油饭。' },
        dinner: { name: '麦当劳：板烧鸡腿堡 + 玉米杯', kcal: 480, protein: 29, place: '麦当劳', order: '板烧鸡腿堡不要 mayo（或酱少放）；玉米杯；零度可乐；不要薯条和炸鸡。' },
        snack: { name: '苹果 + 茶叶蛋 + 10 颗杏仁', kcal: 220, protein: 9, place: '便利店', order: '苹果 1 个；茶叶蛋 1 个；原味杏仁 10 颗。' }
      }
    },
    {
      n: 3,
      weekday: '周三',
      tag: '有氧 + 背部',
      title: '踏步有氧 + 10 分钟背部',
      subtitle: '2000 步，膝盖友好',
      duration: 30,
      intensity: '低–中',
      burn: '约 140–190 kcal',
      video: {
        title: '周六野 20 分钟欢乐踏步（无深蹲/跳跃）',
        platform: 'B 站',
        url: 'https://www.bilibili.com/video/BV1AE4ZecEfy/',
        note: '先做踏步；背部视频用下面的“第二个视频”，做 8 分钟即可。'
      },
      extraVideo: {
        title: '10 分钟背部训练（趴床/垫上）',
        platform: 'B 站',
        url: 'https://www.bilibili.com/video/BV1Tpc3zcEv3/',
        note: '找肩胛骨发力，不追求幅度。'
      },
      blocks: [
        { title: '热身', time: '3 分钟', items: ['原地踏步', '手臂绕环', '髋部绕环'] },
        { title: '跟练 1', time: '20 分钟', items: ['周六野 20 分钟欢乐踏步（无深蹲/跳跃）'] },
        { title: '跟练 2', time: '8 分钟', items: ['10 分钟背部训练（趴床/垫上，做 8 分钟即可）'] },
        { title: '收尾', time: '2 分钟', items: ['胸椎伸展', '婴儿式呼吸'] }
      ],
      steps: 8500,
      note: '背部视频不用追求“瘦背”，目的是让肩胛骨会动、改善含胸。',
      meals: {
        breakfast: { name: '希腊酸奶 + 燕麦 + 香蕉', kcal: 330, protein: 24, place: '便利店/自制', order: '无糖希腊酸奶 200g；燕麦片 30g；香蕉 1 根；不要蜂蜜和格兰诺拉。' },
        lunch: { name: '越南牛肉粉（粉半份）', kcal: 560, protein: 36, place: '越南粉店', order: '牛肉粉，粉半份，牛肉加一份，豆芽/罗勒多；汤别喝完；不要油炸春卷，辣椒酱少。' },
        dinner: { name: '少油酸菜鱼 + 半碗饭', kcal: 600, protein: 46, place: '川菜/酸菜鱼', order: '酸菜鱼少油少辣，鱼片多，配菜多，汤不喝，米饭半份；不要油泼辣子。' },
        snack: { name: '小番茄 + 原味豆干', kcal: 120, protein: 8, place: '便利店', order: '小番茄一盒；原味豆干一小包。' }
      }
    },
    {
      n: 4,
      weekday: '周四',
      tag: '力量 B',
      title: '全身力量 B',
      subtitle: '全程徒手，练背、臀腿和核心',
      duration: 35,
      intensity: '低–中',
      burn: '约 150–220 kcal',
      video: {
        title: '帕梅拉 20 分钟新手无器械全身',
        platform: 'B 站',
        url: 'https://www.bilibili.com/video/BV114411m7Fi/',
        note: '全程徒手，不用哑铃/水瓶；动作不熟可暂停，跟不上就降速。'
      },
      blocks: [
        { title: '热身', time: '5 分钟', items: ['原地踏步 2 分钟', '肩绕环', '髋铰链 10 次', '徒手深蹲 8 次'] },
        { title: '跟练', time: '20 分钟', items: ['帕梅拉 20 分钟新手无器械全身', '动作不熟可暂停；不憋气，不做到力竭'] },
        { title: '基础五式', time: '8 分钟', items: ['反向箭步蹲 3 × 8/侧', '斜板俯卧撑 3 × 8', '臀桥 3 × 12', '俯身 Y 字举 3 × 12', '平板支撑 3 × 20–30 秒'] },
        { title: '收尾', time: '2 分钟', items: ['臀部和背阔肌拉伸'] }
      ],
      steps: 8000,
      note: '“薄背”不是练小背，而是肩胛稳定、圆肩减少；Y 字举、俯卧撑和臀桥比疯狂练腹更有用。',
      meals: {
        breakfast: { name: '牛肉肠粉（少酱）+ 无糖豆浆', kcal: 450, protein: 27, place: '肠粉店', order: '牛肉肠粉，酱汁少放/分装，不要油条；豆浆无糖。' },
        lunch: { name: 'Subway 6 寸双份鸡胸', kcal: 450, protein: 40, place: 'Subway', order: '6 寸全麦；鸡胸/火鸡胸双份；蔬菜全加；不要芝士和蛋黄酱；酱用芥末或红酒醋，少盐。' },
        dinner: { name: '潮汕牛肉火锅', kcal: 650, protein: 50, place: '牛肉火锅', order: '清汤锅；瘦牛肉 2 盘；豆腐、菌菇、绿叶菜；河粉一小份；沙茶酱少，蘸酱油+醋+蒜；不要炸腐竹和牛肉丸。' },
        snack: { name: '无糖酸奶 + 草莓', kcal: 110, protein: 11, place: '便利店', order: '无糖酸奶 100g；草莓一小盒。' }
      }
    },
    {
      n: 5,
      weekday: '周五',
      tag: 'Zone 2 走路',
      title: '35–40 分钟快走',
      subtitle: '最不伤膝、最容易坚持的减脂',
      duration: 45,
      intensity: '低',
      burn: '约 180–250 kcal',
      video: {
        title: '10 分钟睡前拉伸（走完做）',
        platform: 'B 站',
        url: 'https://www.bilibili.com/video/BV1i3cBzpEmH/',
        note: '走路不用视频。户外、跑步机或商场都行；走完跟拉伸。'
      },
      blocks: [
        { title: '快走', time: '35–40 分钟', items: ['能说话但不能唱歌的强度', '步幅不用大，脚掌轻落', '每 10 分钟喝两口水'] },
        { title: '拉伸', time: '10 分钟', items: ['跟练 10 分钟睡前拉伸', '重点：小腿、髋前侧、胸椎'] }
      ],
      steps: 10000,
      note: '今天不安排 HIIT。减脂不是每天都要暴汗，走路把 NEAT 拉起来更可持续。',
      meals: {
        breakfast: { name: '吉士蛋麦满分 + 无糖咖啡', kcal: 315, protein: 17, place: '麦当劳', order: '吉士蛋麦满分；不要薯饼和橙汁；咖啡不加糖奶。' },
        lunch: { name: '日料：刺身 + 6 件寿司 + 海藻沙拉', kcal: 570, protein: 39, place: '日料店', order: '刺身拼盘；寿司 6 件（不要天妇罗/美乃滋卷）；海藻沙拉；味噌汤；酱油少。' },
        dinner: { name: '老乡鸡：香菇鸡腿去皮 + 2 青菜 + 半饭', kcal: 520, protein: 37, place: '老乡鸡', order: '香菇鸡腿去皮；两份时蔬；米饭半份；不要汤汁拌饭。' },
        snack: { name: '蛋白棒或茶叶蛋 + 水果', kcal: 180, protein: 15, place: '便利店', order: '蛋白棒 1 根，或茶叶蛋 1 个 + 苹果半个。' }
      }
    },
    {
      n: 6,
      weekday: '周六',
      tag: '轻有氧 + 体态',
      title: '20 分钟踏步 + 10 分钟体态',
      subtitle: '周末不补课，轻轻动一下',
      duration: 32,
      intensity: '低',
      burn: '约 100–150 kcal',
      video: {
        title: '周六野 20 分钟欢乐踏步（可只做 15 分钟）',
        platform: 'B 站',
        url: 'https://www.bilibili.com/video/BV1AE4ZecEfy/',
        note: '先做踏步；再做下面的 10 分钟体态。'
      },
      extraVideo: {
        title: '10 分钟挺拔体态（改善圆肩驼背）',
        platform: 'B 站',
        url: 'https://www.bilibili.com/video/BV12oLz6hEdt/',
        note: '动作轻，不追求幅度；感受肩胛骨向下沉。'
      },
      blocks: [
        { title: '热身', time: '3 分钟', items: ['原地踏步', '肩绕环', '髋部绕环'] },
        { title: '跟练 1', time: '20 分钟', items: ['20 分钟欢乐踏步（可只做 15 分钟）'] },
        { title: '跟练 2', time: '10 分钟', items: ['10 分钟挺拔体态（改善圆肩驼背）'] },
        { title: '收尾', time: '2 分钟', items: ['深呼吸 10 次', '胸肌拉伸'] }
      ],
      steps: 9000,
      note: '今天量腰围、拍正面/侧面照。照片比体重更能看出“薄”的变化。',
      meals: {
        breakfast: { name: '紫薯 + 2 个水煮蛋 + 牛奶', kcal: 400, protein: 23, place: '便利店/自制', order: '紫薯 150g；水煮蛋 2 个；纯牛奶 250ml；不要油条和甜豆浆。' },
        lunch: { name: '轻食牛肉碗', kcal: 520, protein: 44, place: '轻食店', order: '牛肉双份；糙米半份；蔬菜加量；酱汁分装；不要芝士和脆片。' },
        dinner: { name: '番茄牛肉汤 + 蔬菜 + 小份主食', kcal: 550, protein: 38, place: '家常菜/汤饭', order: '番茄牛肉汤，牛肉多、蔬菜多；主食小份；不喝汤底，少盐。' },
        snack: { name: '无糖豆浆 + 10 颗杏仁', kcal: 170, protein: 12, place: '便利店', order: '无糖豆浆 300ml；原味杏仁 10 颗。' }
      }
    },
    {
      n: 7,
      weekday: '周日',
      tag: '恢复',
      title: '休息 + 10 分钟拉伸',
      subtitle: '恢复也是计划的一部分',
      duration: 15,
      intensity: '恢复',
      burn: '约 30–50 kcal',
      video: {
        title: '10 分钟全身拉伸',
        platform: 'B 站',
        url: 'https://www.bilibili.com/video/BV1i3cBzpEmH/',
        note: '只拉伸，不补练。走 20 分钟也可以，但不要加 HIIT。'
      },
      blocks: [
        { title: '拉伸', time: '10 分钟', items: ['跟练 10 分钟睡前拉伸', '动作轻，不追求疼痛'] },
        { title: '复盘', time: '5 分钟', items: ['记录本周 7 日均重', '量腰围、拍照片', '在 App 里生成本周复盘'] }
      ],
      steps: 6000,
      note: '如果特别累、睡不好、心跳快，今天完全休息。少练一天不会毁掉计划。',
      meals: {
        breakfast: { name: '全麦三明治 + 无糖酸奶', kcal: 420, protein: 35, place: '咖啡店/便利店', order: '全麦鸡胸三明治，酱分装；无糖酸奶 100g。' },
        lunch: { name: '清蒸鱼/白切鸡 + 2 蔬菜 + 半饭', kcal: 470, protein: 50, place: '家常菜', order: '清蒸鱼或白切鸡去皮；两份蔬菜；米饭半份；不要红烧和糖醋。' },
        dinner: { name: '番茄鸡肉蔬菜汤 + 半饭', kcal: 500, protein: 38, place: '汤饭/家常菜', order: '番茄鸡肉蔬菜汤，鸡胸肉多；米饭半份或土豆小份；少油少盐。' },
        snack: { name: '橙子 + 茶叶蛋', kcal: 130, protein: 7, place: '便利店', order: '橙子 1 个；茶叶蛋 1 个。' }
      }
    }
  ]
};
