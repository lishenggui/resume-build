import React, { useState, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import mammoth from 'mammoth';
import { Download, LayoutTemplate, Upload, FileText, Palette, Columns, Monitor, Type } from 'lucide-react';
import { initialResumeState } from './data/initialState';
import Editor from './components/Editor';
import Preview from './components/Preview';

function App() {
  const [resumeData, setResumeData] = useState(initialResumeState);
  const [template, setTemplate] = useState('modern'); // 'modern', 'classic', 'sidebar'
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const componentRef = useRef(null);
  const fileInputRef = useRef(null);

  // 智能解析导入的 DOCX 文件 - 提取完整简历信息
  const parseDocxContent = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    // ========== 基本信息提取 ==========
    const name = lines[0] || '未命名';
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    const phoneMatch = text.match(/1[3-9]\d{9}|(\d{3,4}[-\s]?\d{7,8})/);
    const websiteMatch = text.match(/(?:https?:\/\/)?(?:www\.)?[\w-]+\.[\w.-]+(?:\/[\w.-]*)?/gi);

    // ========== 职位识别 (多策略) ==========
    let title = '';

    // 常见职位关键词
    const jobKeywords = [
      '工程师', '设计师', '经理', '主管', '总监', '专员', '助理', '顾问', '分析师',
      '开发', '前端', '后端', '全栈', '架构师', '产品', '运营', '市场', '销售',
      'CEO', 'CTO', 'CFO', 'COO', 'VP', 'Director', 'Manager', 'Engineer', 'Developer',
      'Designer', 'Analyst', 'Specialist', 'Consultant', 'Lead', 'Senior', 'Junior',
      '实习生', '应届生', '高级', '资深', '首席', '负责人', '创始人', '合伙人'
    ];

    // 策略1: 检查前5行是否包含职位关键词
    for (let i = 1; i < Math.min(6, lines.length); i++) {
      const line = lines[i];
      // 跳过包含邮箱或电话的行
      if (line.includes('@') || /1[3-9]\d{9}/.test(line)) continue;
      // 跳过太长的行（可能是简介）
      if (line.length > 25) continue;

      const hasJobKeyword = jobKeywords.some(kw => line.includes(kw));
      if (hasJobKeyword) {
        title = line;
        break;
      }
    }

    // 策略2: 如果没找到，检查是否有"求职意向"或"应聘岗位"
    if (!title) {
      const intentKeywords = ['求职意向', '应聘岗位', '目标职位', '期望职位', 'Position', 'Title'];
      for (let i = 0; i < lines.length; i++) {
        if (intentKeywords.some(kw => lines[i].includes(kw))) {
          // 提取冒号后的内容或下一行
          const colonIndex = lines[i].indexOf('：') !== -1 ? lines[i].indexOf('：') : lines[i].indexOf(':');
          if (colonIndex !== -1 && colonIndex < lines[i].length - 1) {
            title = lines[i].substring(colonIndex + 1).trim();
          } else if (i + 1 < lines.length) {
            title = lines[i + 1];
          }
          break;
        }
      }
    }

    // 策略3: 如果第二行不含特殊字符且较短，作为职位
    if (!title && lines[1] && lines[1].length <= 20 && !lines[1].includes('@') && !/1[3-9]\d/.test(lines[1])) {
      title = lines[1];
    }

    // 提取地址（查找包含"市"、"省"、"区"的行）
    const locationMatch = text.match(/[\u4e00-\u9fa5]*(?:省|市|区|县|镇|路|街|号)[\u4e00-\u9fa5\d]*/);

    // ========== 城市提取 ==========
    let city = '';
    const cityMatch = text.match(/(北京|上海|广州|深圳|杭州|南京|成都|武汉|西安|重庆|天津|苏州|郑州|长沙|东莞|青岛|沈阳|宁波|昆明|合肥|厦门|福州|济南|哈尔滨|大连|长春|无锡|佛山|石家庄|太原|南昌|贵阳|兰州|海口|三亚|珠海|中山|惠州|温州|常州|南宁|乌鲁木齐|呼和浩特|银川|西宁|拉萨|[\u4e00-\u9fa5]{2,4}市)/);
    if (cityMatch) {
      city = cityMatch[1].replace('市', '');
    }

    // ========== 年龄提取 ==========
    let age = '';
    const agePatterns = [
      /(\d{1,2})\s*岁/,
      /年龄[：:]\s*(\d{1,2})/,
      /Age[：:]\s*(\d{1,2})/i
    ];
    for (const pattern of agePatterns) {
      const match = text.match(pattern);
      if (match) {
        age = match[1];
        break;
      }
    }

    // ========== 性别提取 ==========
    let gender = '';
    if (text.includes('男') && !text.includes('女')) {
      gender = '男';
    } else if (text.includes('女') && !text.includes('男')) {
      gender = '女';
    } else {
      const genderMatch = text.match(/性别[：:]\s*(男|女)/);
      if (genderMatch) {
        gender = genderMatch[1];
      }
    }
    // ========== 个人简介提取 ==========
    let summary = '';
    const summaryKeywords = ['个人简介', '简介', '自我介绍', '个人介绍', 'profile', 'summary', '关于我', '自我评价'];
    const summaryIndex = lines.findIndex(line =>
      summaryKeywords.some(kw => line.toLowerCase().includes(kw.toLowerCase()))
    );
    if (summaryIndex !== -1) {
      // 获取关键词后到下一个大标题之间的内容
      const nextSectionIndex = findNextSectionIndex(lines, summaryIndex + 1);
      summary = lines.slice(summaryIndex + 1, nextSectionIndex).join(' ').substring(0, 500);
    }

    // ========== 工作经历提取 ==========
    const experience = [];
    const expKeywords = ['工作经历', '工作经验', '项目经历', '项目经验', 'experience', 'work history', '职业经历'];
    const expIndex = lines.findIndex(line =>
      expKeywords.some(kw => line.toLowerCase().includes(kw.toLowerCase()))
    );

    if (expIndex !== -1) {
      const expEndIndex = findNextSectionIndex(lines, expIndex + 1);
      const expLines = lines.slice(expIndex + 1, expEndIndex);

      // 解析工作经历项 - 查找日期模式 (支持 YYYY.MM - YYYY.MM 格式)
      // Group 1: Start Year, Group 2: Start Month, Group 3: End Year, Group 4: End Month
      const datePattern = /(\d{4})(?:\s*[年./-]\s*(\d{1,2}))?[月]?\s*[-–至到~—]\s*(?:(\d{4})(?:\s*[年./-]\s*(\d{1,2}))?[月]?|至今|现在|present)?/i;
      let currentExp = null;

      for (let i = 0; i < expLines.length; i++) {
        const line = expLines[i];
        const dateMatch = line.match(datePattern);

        if (dateMatch) {
          // 发现日期，创建新的经历项
          if (currentExp) {
            experience.push(currentExp);
          }
          // 提取日期
          const startDate = dateMatch[1] + (dateMatch[2] ? '.' + dateMatch[2].padStart(2, '0') : '');
          const endDate = dateMatch[3] ? (dateMatch[3] + (dateMatch[4] ? '.' + dateMatch[4].padStart(2, '0') : '')) : '至今';

          // 尝试从同一行或前一行提取公司名
          // 清理残留的标点符号
          let company = line.replace(datePattern, '').trim().replace(/^[.。,，\-—]+/, '').trim();
          if (!company && i > 0) {
            company = expLines[i - 1];
          }

          currentExp = {
            id: Date.now() + i,
            company: company || '公司名称',
            role: '',
            startDate: startDate,
            endDate: endDate.toLowerCase().includes('至今') || endDate.includes('现在') || endDate.toLowerCase() === 'present' ? '至今' : endDate,
            description: ''
          };
        } else if (currentExp) {
          // 添加到当前经历的描述
          if (!currentExp.role && line.length < 30 && !line.includes('：') && !line.includes(':') && !/^\d/.test(line)) {
            currentExp.role = line;
          } else {
            // ========== 核心亮点提取算法 ==========
            // 目标：从大段文本中提取最有价值的 3-4 个点

            let cleanLine = line.trim().replace(/^[\*\-•·\d\.]+\s*/, '');
            if (cleanLine.length < 5) return;

            // 1. 评分系统：根据关键词权重打分
            let score = 0;
            const actionVerbs = ['负责', '主导', '设计', '实现', '优化', '重构', '提升', '降低', '节约', '管理', '带领', '从0到1', '搭建', '解决', 'Designed', 'Implemented', 'Led', 'Managed', 'Optimized'];
            const metricsKeywords = ['%', '万', '亿', '倍', 'k', 'w', 'ms', 'MB', 'GB', 'TB', '用户', '收入', '性能'];
            const weakKeywords = ['协助', '参与', '了解', '学习', '维护', '配合'];

            // 包含行为动词 +20
            if (actionVerbs.some(kw => cleanLine.includes(kw))) score += 20;
            // 包含数据指标 +30
            if (metricsKeywords.some(kw => cleanLine.includes(kw) || /\d+/.test(cleanLine))) score += 30;
            // 包含弱动词 -10
            if (weakKeywords.some(kw => cleanLine.includes(kw))) score -= 10;
            // 长度适中 +10 (15-50字)
            if (cleanLine.length >= 15 && cleanLine.length <= 50) score += 10;
            // 过短或过长 -10
            if (cleanLine.length < 10 || cleanLine.length > 80) score -= 10;

            // 2. 存储候选句（如果之前还没有 description 数组，先初始化）
            if (!currentExp._candidates) currentExp._candidates = [];

            currentExp._candidates.push({
              text: cleanLine,
              score: score
            });

            // 实时更新 description（取前3名）
            const topCandidates = currentExp._candidates
              .sort((a, b) => b.score - a.score)
              .slice(0, 4); // 最多保留4条

            currentExp.description = topCandidates
              .map(c => `• ${c.text}`)
              .join('\n');
          }
        }
      }
      if (currentExp) {
        experience.push(currentExp);
      }
    }

    // ========== 教育背景提取 ==========
    const education = [];
    const eduKeywords = ['教育背景', '教育经历', '学历', 'education', '学习经历', '毕业院校', '学校'];
    const eduIndex = lines.findIndex(line =>
      eduKeywords.some(kw => line.toLowerCase().includes(kw.toLowerCase()))
    );

    if (eduIndex !== -1) {
      const eduEndIndex = findNextSectionIndex(lines, eduIndex + 1);
      const eduLines = lines.slice(eduIndex + 1, eduEndIndex);

      // 更宽泛的学校名模式匹配
      const schoolPatterns = [
        /[\u4e00-\u9fa5]*(大学|学院|学校|中学|高中|职业技术)/i,
        /University|College|Institute|School|Academy/i,
        /[\u4e00-\u9fa5]{2,}(师范|理工|科技|财经|医科|农业|林业|交通|外语|外国语)/i
      ];

      // 学位/专业模式
      const degreePatterns = [
        /本科|硕士|博士|学士|研究生|专科|大专|MBA|EMBA|PhD|Master|Bachelor/i,
        /专业|系|方向|学位/,
        /计算机|软件|电子|机械|金融|会计|管理|设计|工程|法学|医学|教育/
      ];

      let currentEdu = null;

      for (let i = 0; i < eduLines.length; i++) {
        const line = eduLines[i];

        // 检查是否匹配学校模式
        const isSchool = schoolPatterns.some(pattern => pattern.test(line));

        // 提取日期
        const dateMatch = line.match(/(\d{4})[年./-]?(\d{1,2})?[月]?\s*[-–至到~]\s*(\d{4}|至今|现在|present|今)?[年]?(\d{1,2})?[月]?/i);

        if (isSchool) {
          // 发现新学校
          if (currentEdu) {
            education.push(currentEdu);
          }

          // 清理学校名（移除日期）
          let schoolName = line
            .replace(/\d{4}[年./-]?\d*[月]?\s*[-–至到~]\s*\d*[年]?\d*[月]?/g, '')
            .replace(/至今|现在|present/gi, '')
            .trim();

          currentEdu = {
            id: Date.now() + i + 1000,
            school: schoolName || line.substring(0, 30),
            degree: '',
            date: ''
          };

          // 从同一行提取日期
          if (dateMatch) {
            const startYear = dateMatch[1];
            const endYear = dateMatch[3] || '至今';
            currentEdu.date = `${startYear} - ${endYear === '今' || endYear === '现在' || endYear.toLowerCase() === 'present' ? '至今' : endYear}`;
          }
        } else if (currentEdu) {
          // 查找专业/学位信息
          const isDegree = degreePatterns.some(pattern => pattern.test(line));
          if (isDegree && !currentEdu.degree) {
            currentEdu.degree = line.replace(/\d{4}.*/, '').trim();
          }

          // 如果当前行有日期且还没提取到日期
          if (dateMatch && !currentEdu.date) {
            const startYear = dateMatch[1];
            const endYear = dateMatch[3] || '至今';
            currentEdu.date = `${startYear} - ${endYear}`;
          }
        } else {
          // 第一次遇到的可能是日期+学校混合行
          if (dateMatch && line.length > 10) {
            currentEdu = {
              id: Date.now() + i + 1000,
              school: line.replace(/\d{4}[年./-]?\d*[月]?\s*[-–至到~]\s*\d*[年]?\d*[月]?/g, '').trim() || '学校名称',
              degree: '',
              date: `${dateMatch[1]} - ${dateMatch[3] || '至今'}`
            };
          }
        }
      }
      if (currentEdu) {
        education.push(currentEdu);
      }
    }

    // ========== 技能提取 (关键词模式) ==========
    let skills = [];
    const skillKeywords = ['专业技能', '技能', '技术栈', 'skills', '擅长', '熟练掌握', '技术能力', '核心能力'];
    const skillIndex = lines.findIndex(line =>
      skillKeywords.some(kw => line.toLowerCase().includes(kw.toLowerCase()))
    );

    // 常见技能关键词库
    const commonSkills = [
      'Java', 'Python', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'PHP', 'Swift', 'Kotlin',
      'React', 'Vue', 'Angular', 'HTML', 'CSS', 'Node.js', 'Next.js', 'Webpack',
      'Spring', 'SpringBoot', 'Django', 'Flask', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Nginx',
      'Git', 'Docker', 'Kubernetes', 'Linux', 'AWS', 'Azure', '阿里云', '腾讯云',
      'Figma', 'Sketch', 'Photoshop', 'Illustrator', 'UI设计', 'UX设计', 'PS', 'AI',
      'Excel', 'PPT', 'Word', '数据分析', '项目管理', 'Scrum', '敏捷开发',
      '英语', '日语', '沟通能力', '团队协作', '领导力', '产品设计', '原型设计'
    ];

    if (skillIndex !== -1) {
      const skillEndIndex = findNextSectionIndex(lines, skillIndex + 1);
      const skillLines = lines.slice(skillIndex + 1, skillEndIndex);
      const skillText = skillLines.join(' ');

      // 方法1: 按分隔符分割，只保留短词
      const splitSkills = skillText
        .split(/[,，、;；|/\n\s]+/)
        .map(s => s.trim())
        .filter(s => s && s.length >= 2 && s.length <= 12 && !/^[\d.]+$/.test(s));

      // 方法2: 从文本中匹配已知技能
      const matchedSkills = commonSkills.filter(skill =>
        skillText.toLowerCase().includes(skill.toLowerCase())
      );

      // 合并并去重，优先展示匹配的已知技能
      const allSkills = [...new Set([...matchedSkills, ...splitSkills])];
      skills = allSkills.slice(0, 12);
    } else {
      // 即使没有明确的技能section，也尝试从全文提取已知技能
      const fullText = lines.join(' ');
      skills = commonSkills.filter(skill =>
        fullText.toLowerCase().includes(skill.toLowerCase())
      ).slice(0, 8);
    }

    // 辅助函数：查找下一个section的索引
    function findNextSectionIndex(lines, startIndex) {
      const sectionKeywords = [
        '个人简介', '简介', '工作经历', '工作经验', '项目经历', '教育背景',
        '教育经历', '技能', '专业技能', '证书', '荣誉', '自我评价',
        'profile', 'experience', 'education', 'skills', 'awards'
      ];

      for (let i = startIndex; i < lines.length; i++) {
        if (sectionKeywords.some(kw => lines[i].toLowerCase().includes(kw.toLowerCase()))) {
          return i;
        }
      }
      return lines.length;
    }

    return {
      personal: {
        fullName: name,
        title: title || '职位待填写',
        email: emailMatch ? emailMatch[0] : '',
        phone: phoneMatch ? phoneMatch[0] : '',
        location: locationMatch ? locationMatch[0] : '',
        website: (() => {
          // 排除常见邮箱域名
          const emailDomains = ['163.com', 'qq.com', 'gmail.com', 'outlook.com', 'hotmail.com', '126.com', 'sina.com', 'foxmail.com', 'yeah.net', 'sohu.com'];
          if (websiteMatch && websiteMatch.length > 0) {
            const validSite = websiteMatch.find(w =>
              !emailDomains.some(domain => w.toLowerCase() === domain || w.toLowerCase().endsWith('@' + domain))
              && (w.includes('http') || w.includes('www') || w.includes('/') || w.includes('-'))
            );
            return validSite || '';
          }
          return '';
        })(),
        summary: summary,
        city: city,
        age: age,
        gender: gender
      },
      experience: experience.length > 0 ? experience : [],
      education: education.length > 0 ? education : [],
      skills: skills
    };
  };

  const handleImportDocx = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型 - mammoth 只支持 .docx 格式
    if (file.name.endsWith('.doc') && !file.name.endsWith('.docx')) {
      alert('⚠️ 不支持旧版 .doc 格式\n\n请将文件另存为 .docx 格式后再导入。\n\n操作方法：用 Word 打开文件 → 文件 → 另存为 → 选择 ".docx" 格式');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!file.name.endsWith('.docx')) {
      alert('请选择 .docx 格式的 Word 文件');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);

    try {
      const arrayBuffer = await file.arrayBuffer();

      let textContent = '';
      let extractedPhoto = '';

      try {
        // 收集所有图片用于后续筛选
        const allImages = [];

        // 尝试使用 mammoth 解析并提取图片
        const htmlResult = await mammoth.convertToHtml({
          arrayBuffer: arrayBuffer
        }, {
          convertImage: mammoth.images.imgElement(function (image) {
            return image.read("base64").then(function (imageBuffer) {
              // 收集所有图片
              if (image.contentType) {
                allImages.push({
                  data: `data:${image.contentType};base64,${imageBuffer}`,
                  contentType: image.contentType
                });
              }
              return { src: `data:${image.contentType};base64,${imageBuffer}` };
            });
          })
        });

        // 智能选择头像：找最可能是人像的图片
        if (allImages.length > 0) {
          // 创建临时图片元素来获取尺寸
          const selectBestPortrait = async () => {
            const imageWithSizes = await Promise.all(allImages.map(img => {
              return new Promise((resolve) => {
                const imgEl = new Image();
                imgEl.onload = () => {
                  const aspectRatio = imgEl.width / imgEl.height;
                  const size = imgEl.width * imgEl.height;
                  // 评分：竖版图片(高>宽)得分最高，尺寸适中得分高
                  let score = 0;
                  // 竖版照片优先（人像通常是竖版）
                  if (aspectRatio < 1) score += 60; // 高度 > 宽度
                  if (aspectRatio >= 0.6 && aspectRatio <= 0.9) score += 40; // 典型人像比例
                  // 接近正方形也可以
                  if (aspectRatio >= 0.9 && aspectRatio <= 1.1) score += 30;
                  // 尺寸适中
                  if (size >= 5000 && size <= 500000) score += 30;
                  if (size >= 10000 && size <= 200000) score += 20;
                  resolve({ ...img, width: imgEl.width, height: imgEl.height, score });
                };
                imgEl.onerror = () => resolve({ ...img, width: 0, height: 0, score: 0 });
                imgEl.src = img.data;
              });
            }));

            // 按得分排序，选最高分
            imageWithSizes.sort((a, b) => b.score - a.score);
            return imageWithSizes[0]?.score > 30 ? imageWithSizes[0].data : allImages[0].data;
          };

          extractedPhoto = await selectBestPortrait();
        }

        // 从 HTML 中提取纯文本，保留换行
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlResult.value;

        // 在块级元素后添加换行符
        const blockElements = tempDiv.querySelectorAll('p, div, br, h1, h2, h3, h4, h5, h6, li, tr');
        blockElements.forEach(el => {
          el.insertAdjacentText('afterend', '\n');
        });

        textContent = (tempDiv.textContent || tempDiv.innerText || '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

      } catch (mammothError) {
        console.error('Mammoth 解析失败:', mammothError);
        // 如果 mammoth 失败，尝试直接读取文本
        const textDecoder = new TextDecoder('utf-8');
        const rawText = textDecoder.decode(arrayBuffer);
        // 提取可读文本（去除二进制字符）
        textContent = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').replace(/\s+/g, ' ');
      }

      if (!textContent || textContent.trim().length < 10) {
        throw new Error('无法提取文件内容');
      }

      const parsedData = parseDocxContent(textContent);

      // 如果提取到了图片，添加到 personal 数据中
      if (extractedPhoto) {
        parsedData.personal.photo = extractedPhoto;
      }

      // 应用所有解析到的数据
      setResumeData(prev => ({
        personal: { ...prev.personal, ...parsedData.personal },
        experience: parsedData.experience.length > 0 ? parsedData.experience : prev.experience,
        education: parsedData.education.length > 0 ? parsedData.education : prev.education,
        skills: parsedData.skills.length > 0 ? parsedData.skills : prev.skills
      }));

      // 显示导入结果摘要
      const importSummary = [
        parsedData.personal.fullName ? `姓名: ${parsedData.personal.fullName}` : '',
        extractedPhoto ? '头像: ✓ 已提取' : '',
        parsedData.experience.length > 0 ? `工作经历: ${parsedData.experience.length} 条` : '',
        parsedData.education.length > 0 ? `教育背景: ${parsedData.education.length} 条` : '',
        parsedData.skills.length > 0 ? `技能: ${parsedData.skills.length} 项` : ''
      ].filter(Boolean).join('\n');

      alert(`✅ 简历导入成功！\n\n已识别：\n${importSummary}\n\n请检查并补充详细信息。`);
    } catch (error) {
      console.error('导入失败:', error);
      alert(`❌ 导入失败\n\n错误: ${error.message || '未知错误'}\n\n请尝试：\n1. 确保文件是有效的 .docx 格式\n2. 尝试用 Word 重新保存文件\n3. 检查文件是否损坏`);
    } finally {
      setIsImporting(false);
      // 重置 input 以允许再次选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadPDF = async () => {
    if (!componentRef.current || isExporting) return;

    setIsExporting(true);

    const element = componentRef.current;
    const opt = {
      margin: 0,
      filename: `${resumeData.personal.fullName.replace(/\s+/g, '_')}_简历.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF 导出失败:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const updatePersonal = (field, value) => {
    setResumeData(prev => ({
      ...prev,
      personal: { ...prev.personal, [field]: value }
    }));
  };

  return (
    <div className="app-container flex">
      {/* 隐藏的文件输入 - 仅支持 .docx */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportDocx}
        accept=".docx"
        style={{ display: 'none' }}
      />

      {/* Sidebar / Editor Area */}
      <aside className="editor-panel">
        <header className="editor-header">
          {/* 第一行：标题 + 操作按钮 */}
          <div className="header-row-top">
            <h1>简历工作室</h1>
            <div className="header-actions">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="btn btn-secondary flex gap-2"
                title="导入 Word 简历"
              >
                <Upload size={16} />
                <span>{isImporting ? '导入中...' : '导入'}</span>
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={isExporting}
                className="btn btn-primary flex gap-2"
              >
                <Download size={16} />
                <span>{isExporting ? '导出中...' : '下载 PDF'}</span>
              </button>
            </div>
          </div>

          {/* 第二行：模板选择器 */}
          <div className="template-switcher">
            {[
              { id: 'modern', name: '现代', icon: Monitor },
              { id: 'classic', name: '经典', icon: FileText },
              { id: 'sidebar', name: '侧栏', icon: Columns },
              { id: 'creative', name: '创意', icon: Palette },
              { id: 'minimal', name: '极简', icon: Type },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`template-btn ${template === t.id ? 'active' : ''}`}
                title={t.name}
              >
                <t.icon size={16} />
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="editor-content scroll-container">
          <Editor
            data={resumeData}
            updatePersonal={updatePersonal}
            setResumeData={setResumeData}
          />
        </div>
      </aside>

      {/* Preview Area */}
      <main className="preview-panel">
        <div className="preview-container">
          <div className="a4-wrapper shadow-lg">
            <Preview ref={componentRef} data={resumeData} template={template} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
