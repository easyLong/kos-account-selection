/**
 * 财经KOS_IP潜力筛选问卷标准题库与评分ABS定级规则
 * 来源: 汇添富 财经KOS_IP潜力筛选问卷.xlsx
 * 参考链接: https://v.wjx.cn/vm/YQHOnEg.aspx
 */

export const WENJUANXING_BASE_URL = 'https://v.wjx.cn/vm/YQHOnEg.aspx';

export const SURVEY_TITLE = '财经KOS-IP潜力调查问卷';

export const SURVEY_MODULES = [
  {
    id: 'm1',
    name: '模块一·表达沟通能力',
    desc: '考察观点输出欲、同理心受众思维与多维度阐释能力',
    questions: [
      {
        id: 1,
        type: 'scale',
        text: '我说话，是为了让听得懂的人听懂，还是为了让听不懂的人也愿意听懂？我更看重后者'
      },
      {
        id: 2,
        type: 'scale',
        text: '语言于我，是照亮思维的灯，还是困住思想的牢？我更多时候觉得它能照亮'
      },
      {
        id: 3,
        type: 'scale',
        text: '如果沉默是金，我愿意为了把话说漂亮，舍得让金子破财'
      },
      {
        id: 4,
        type: 'scale',
        text: '真正的表达，是让人记住我说的话，还是让人记住我这个人？我更看重后者'
      },
      {
        id: 5,
        type: 'scale',
        text: '一个观点在我眼里常常不止一副面孔，我能看见并说出它们'
      }
    ]
  },
  {
    id: 'm2',
    name: '模块二·差异化特质/深耕爱好',
    desc: '考察个人人设辨识度、独特性自洽度与长期热爱积淀',
    questions: [
      {
        id: 6,
        type: 'scale',
        text: '在人群里，我是那个“被认出的”，还是“被遗忘的”？我更有底气相信是前者'
      },
      {
        id: 7,
        type: 'scale',
        text: '我的独特不是刻意长出来的，而是它本来就在，我只是敢承认它'
      },
      {
        id: 8,
        type: 'scale',
        text: '我愿意把内在那个“不一样的我”公之于众，哪怕它不合群'
      },
      {
        id: 9,
        type: 'scale',
        text: '如果人生是一场叙事，我觉得我的故事线自带风格，而不是复制粘贴'
      },
      {
        id: 10,
        type: 'scale',
        text: '我有一件想对它说“因为热爱，所以坚持”的事，它定义了我的一部分'
      }
    ]
  },
  {
    id: 'm3',
    name: '模块三·跨界专业能力',
    desc: '考察跨学科借镜、知识迁移与“外行说不出、内行没想到”的高维解读力',
    questions: [
      {
        id: 11,
        type: 'scale',
        text: '我相信真正的智慧是“一通百通”，两个不相关的领域往往通向同一个道理'
      },
      {
        id: 12,
        type: 'scale',
        text: '我习惯从别的领域借来透镜，去看那些我以为早已看懂的金融事物'
      },
      {
        id: 13,
        type: 'scale',
        text: '一个问题，我总能找到不止一种解释的坐标系，而不是只认一个标准答案'
      },
      {
        id: 14,
        type: 'scale',
        text: '我掌握的跨界知识，能让我说出“外行说不出、内行没想到”的话'
      }
    ]
  },
  {
    id: 'm4',
    name: '模块四·镜头表现力/出镜意愿',
    desc: '考察面对被注视与评判时的心理稳定性、真实感与镜头松弛度',
    questions: [
      {
        id: 15,
        type: 'scale',
        text: '被观看这件事，对我而言不是威胁，而是一种诚实的在场'
      },
      {
        id: 16,
        type: 'scale',
        text: '当无数目光聚焦于我，我仍能保有“我是谁”的稳定，而不是被目光改造'
      },
      {
        id: 17,
        type: 'scale',
        text: '我愿意把自己暴露在评判之下，因为我相信真实比完美更有力量'
      },
      {
        id: 18,
        type: 'scale',
        text: '我能在被反复审视时保持思考的从容，而不是急着证明自己'
      }
    ]
  },
  {
    id: 'm5',
    name: '模块五·学习力/内容网感',
    desc: '考察探究深度、拥抱新事物敏锐度与提炼受众共鸣点的网感嗅觉',
    questions: [
      {
        id: 19,
        type: 'scale',
        text: '我对世界的运作总有一种“为什么”的好奇，答案之外我还想“那然后呢”'
      },
      {
        id: 20,
        type: 'scale',
        text: '变化对我而言不是打扰，而是世界在向我发出新的邀请'
      },
      {
        id: 21,
        type: 'scale',
        text: '我能从众人的喧嚣里，抽出那条“大家其实都在意、但没人说破”的线索'
      }
    ]
  },
  {
    id: 'm6',
    name: '模块六·自驱力/抗压/持续产出',
    desc: '考察无即时反馈下的长跑韧性、抗逆力与坚定长期主义',
    questions: [
      {
        id: 22,
        type: 'scale',
        text: '我做一件事，意义往往在我出发时就已经存在，不需要等结果来赋予'
      },
      {
        id: 23,
        type: 'scale',
        text: '当过程漫长而无反馈，我更相信“事物自有其节律”，而不是急于听到回声'
      },
      {
        id: 24,
        type: 'scale',
        text: '外界的否定和误解，动摇的是我的处境，而不是我之为我的根基'
      },
      {
        id: 25,
        type: 'scale',
        text: '我愿意把时间铺在一条长路上，因为我相信“长期主义”终会塑造出不一样的自己'
      }
    ]
  },
  {
    id: 'm7',
    name: '简答题·ABS 定级核心加分项',
    desc: '开放作答，每题满分10分，合计20分，为ABS孵化定级的重要依据',
    questions: [
      {
        id: 26,
        type: 'text',
        title: '深耕爱好与跨界领域',
        text: '除金融业务之外，你深耕的爱好/跨界专业领域是什么？简单介绍你的积累和擅长输出的内容方向',
        placeholder: '例如：深耕古典音乐10年/硬核科幻迷/马拉松跑者/心理咨询师认证... 善于用音乐对位法类比资产配置...'
      },
      {
        id: 27,
        type: 'text',
        title: '个人人设与差异化定位',
        text: '如果让你做财经投教账号，你希望打造什么样的个人人设，和别的理财博主最大的区别是什么？',
        placeholder: '例如：温和理性的闺蜜型财务管家/毒舌一针见血的投顾老兵... 坚决不讲晦涩术语，专注教年轻人建立第一份底仓...'
      }
    ]
  }
];

export const SCALE_OPTIONS = [
  { val: 5, label: '完全符合', short: '5分' },
  { val: 4, label: '比较符合', short: '4分' },
  { val: 3, label: '一般符合', short: '3分' },
  { val: 2, label: '不太符合', short: '2分' },
  { val: 1, label: '完全不符合', short: '1分' }
];

/**
 * 根据量表分与简答加分计算 ABS 评级
 * 评分规则来自 Excel 表第 2 张 Sheet
 */
export function calculateABSRating(scaleScore, textScore = 0) {
  const total = scaleScore + textScore;
  
  if (total >= 112 && scaleScore >= 102 && textScore >= 10) {
    return {
      level: 'S级',
      title: '标杆IP',
      color: '#A5741E',
      badgeBg: '#FDF6E8',
      desc: '表达强、镜头松弛、拥有鲜明人设+扎实跨界专长，网感好，自驱力强抗压，天然适合做品牌标杆IP、破圈传播',
      resource: '核心标杆IP，重点全案扶持，代表品牌专业形象，承担行业发声与破圈'
    };
  }
  
  if (total >= 88 && scaleScore >= 80 && textScore >= 4) {
    return {
      level: 'A级',
      title: '主力IP',
      color: '#2E7D32',
      badgeBg: '#E8F5E9',
      desc: '表达流畅、出镜无明显恐惧，具备个人特色，学习力好，能稳定产出内容',
      resource: '中坚主力IP，半托管陪跑孵化，重点资源倾斜，矩阵核心转化力量'
    };
  }
  
  if (total >= 65 && scaleScore >= 60) {
    return {
      level: 'B级',
      title: '储备IP',
      color: '#E65100',
      badgeBg: '#FFF3E0',
      desc: '无明显硬伤，但个人辨识度偏弱、镜头或表达尚有短板',
      resource: '储备孵化IP，先做图文/长文/理财通笔记，循序渐进培养，达标后晋升A级'
    };
  }
  
  return {
    level: '暂不推荐',
    title: '幕后支持',
    color: '#757575',
    badgeBg: '#EEEEEE',
    desc: '短板明显：镜头恐惧、表达偏弱、输出意愿不足、无个人差异化',
    resource: '仅做内容幕后撰稿、素材支持，不建议出镜做个人IP'
  };
}
