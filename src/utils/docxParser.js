/**
 * DOCX 简历解析工具
 * 智能解析导入的 DOCX 文件，提取完整简历信息
 */

// 常见职位关键词
const JOB_KEYWORDS = [
    '工程师', '设计师', '经理', '主管', '总监', '专员', '助理', '顾问', '分析师',
    '开发', '前端', '后端', '全栈', '架构师', '产品', '运营', '市场', '销售',
    'CEO', 'CTO', 'CFO', 'COO', 'VP', 'Director', 'Manager', 'Engineer', 'Developer',
    'Designer', 'Analyst', 'Specialist', 'Consultant', 'Lead', 'Senior', 'Junior',
    '实习生', '应届生', '高级', '资深', '首席', '负责人', '创始人', '合伙人'
];

// 常见技能关键词库
const COMMON_SKILLS = [
    'Java', 'Python', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'PHP', 'Swift', 'Kotlin',
    'React', 'Vue', 'Angular', 'HTML', 'CSS', 'Node.js', 'Next.js', 'Webpack',
    'Spring', 'SpringBoot', 'Django', 'Flask', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Nginx',
    'Git', 'Docker', 'Kubernetes', 'Linux', 'AWS', 'Azure', '阿里云', '腾讯云',
    'Figma', 'Sketch', 'Photoshop', 'Illustrator', 'UI设计', 'UX设计', 'PS', 'AI',
    'Excel', 'PPT', 'Word', '数据分析', '项目管理', 'Scrum', '敏捷开发',
    '英语', '日语', '沟通能力', '团队协作', '领导力', '产品设计', '原型设计'
];

// 辅助函数：判断是否为章节标题
function isSectionHeader(line, keywords) {
    // 标题通常较短
    if (line.length > 40) return false;
    // 标题通常不包含冒号（除非是 Key: Value 格式，也不算章节标题）
    // 但有些标题可能是 "Skills:"
    // 标题通常不以符号开头（如 bullet）
    if (/^[•·◆\-]/.test(line)) return false;

    const lowerLine = line.toLowerCase();
    return keywords.some(kw => lowerLine.includes(kw.toLowerCase()));
}

// 辅助函数：查找下一个 section 的索引
function findNextSectionIndex(lines, startIndex) {
    const sectionKeywords = [
        '个人简介', '简介', '工作经历', '工作经验', '项目经历', '项目经验', '教育背景',
        '教育经历', '技能', '专业技能', '证书', '荣誉', '获奖', '奖项', '资质认证', '自我评价', '个人总结',
        'profile', 'experience', 'education', 'skills', 'awards', 'certifications', 'honors',
        'projects', 'project experience', 'project', '技能特长'
    ];

    for (let i = startIndex; i < lines.length; i++) {
        if (isSectionHeader(lines[i], sectionKeywords)) {
            return i;
        }
    }
    return lines.length;
}

// 提取职位信息
function extractTitle(lines, text) {
    // 策略1: 检查前5行是否包含职位关键词
    for (let i = 1; i < Math.min(6, lines.length); i++) {
        const line = lines[i];
        if (line.includes('@') || /1[3-9]\d{9}/.test(line)) continue;
        if (line.length > 25) continue;

        if (JOB_KEYWORDS.some(kw => line.includes(kw))) {
            return line;
        }
    }

    // 策略2: 检查"求职意向"等关键词
    const intentKeywords = ['求职意向', '应聘岗位', '目标职位', '期望职位', 'Position', 'Title'];
    for (let i = 0; i < lines.length; i++) {
        if (intentKeywords.some(kw => lines[i].includes(kw))) {
            const colonIndex = lines[i].indexOf('：') !== -1 ? lines[i].indexOf('：') : lines[i].indexOf(':');
            if (colonIndex !== -1 && colonIndex < lines[i].length - 1) {
                return lines[i].substring(colonIndex + 1).trim();
            } else if (i + 1 < lines.length) {
                return lines[i + 1];
            }
        }
    }

    // 策略3: 如果第二行不含特殊字符且较短，作为职位
    if (lines[1] && lines[1].length <= 20 && !lines[1].includes('@') && !/1[3-9]\d/.test(lines[1])) {
        return lines[1];
    }

    return '';
}

// 提取工作经历（不含项目经历）
function extractExperience(lines) {
    const experience = [];
    const expKeywords = ['工作经历', '工作经验', 'work experience', 'work history', '职业经历', '实习经历', 'experience'];
    const expIndex = lines.findIndex(line => isSectionHeader(line, expKeywords));

    if (expIndex === -1) return [];

    const expEndIndex = findNextSectionIndex(lines, expIndex + 1);
    const expLines = lines.slice(expIndex + 1, expEndIndex);
    const datePattern = /(\d{4})(?:\s*[\.年\/-]\s*(\d{1,2}))?[月]?\s*(?:[-–至到~—]|\s+-\s+)\s*(?:(\d{4})(?:\s*[\.年\/-]\s*(\d{1,2}))?[月]?|至今|现在|present|今)?(?:[年]?(?:(\d{1,2})?[月]?)?)?/i;
    let currentExp = null;

    for (let i = 0; i < expLines.length; i++) {
        const line = expLines[i];

        // 尝试匹配日期，支持日期在行首或行尾
        // 尝试匹配日期，支持日期在行首或行尾
        let dateMatch = line.match(datePattern);

        // 兜底策略：如果严格正则没匹配到，尝试匹配两个年份，或者年份+至今
        if (!dateMatch) {
            const looseMatch = line.match(/(\d{4}).*?(\d{4}|至今|现在|present|今)/);
            if (looseMatch && line.length < 100) {
                // 构造模拟的 match 数组 [full, startYear, startMonth, endYear, endMonth]
                // 注意：looseMatch[1] 是 startYear, looseMatch[2] 是 endYear 部分
                dateMatch = [looseMatch[0], looseMatch[1], undefined, looseMatch[2].match(/^\d{4}/) ? looseMatch[2] : undefined, undefined];

                // 如果 looseMatch[2] 不是纯数字，说明是 "至今" 等词，这时 matches[3] (endYear) 应该是 undefined
                if (!/^\d{4}/.test(looseMatch[2])) {
                    dateMatch[3] = undefined;
                }
            }
        }

        if (dateMatch) {
            // 如果已经在处理一个经历，保存它
            if (currentExp) {
                experience.push(currentExp);
                currentExp = null;
            }

            const startYear = dateMatch[1];
            const startMonth = dateMatch[2] ? '.' + dateMatch[2].padStart(2, '0') : '';
            const startDate = startYear + startMonth;

            let endDate = '至今';
            if (dateMatch[3]) {
                const endYear = dateMatch[3];
                const endMonth = dateMatch[4] ? '.' + dateMatch[4].padStart(2, '0') : '';
                endDate = endYear + endMonth;
            } else if (/至今|现在|present|今/.test(dateMatch[0]) || (line.match(/至今|现在|present|今/) && !dateMatch[3])) {
                endDate = '至今';
            }

            // 提取公司名称和职位：移除日期部分
            let remaining = line.replace(dateMatch[0], '')
                .replace(/^[◆•·\s]+/, '')  // 移除开头的符号
                .trim();

            let parts = [];
            // 1. 优先尝试管道符分隔 ( | 或 ｜ )
            if (/\||｜/.test(remaining)) {
                parts = remaining.split(/[|｜]/).map(p => p.trim()).filter(p => p);
            } else {
                // 2. 回退到多空格分隔
                parts = remaining.split(/\s{2,}/).filter(p => p.trim());
            }

            let company = '';
            let role = '';

            if (parts.length >= 2) {
                // 有多个部分时，第一个是公司，第二个是职位
                company = parts[0].trim();
                role = parts[1].trim();
            } else if (parts.length === 1) {
                // 只有一个部分，作为公司名
                company = parts[0].trim();
            }

            // 如果本行除了日期没别的（或者太短），大概率公司名在上一行
            if ((!company || company.length < 2) && i > 0) {
                const prevLine = expLines[i - 1].trim();
                if (prevLine.length > 2 && prevLine.length < 50) {
                    company = prevLine;
                }
            }

            currentExp = {
                id: Date.now() + i,
                company: company || '公司名称',
                role: role,  // 可能已经从同一行提取到了
                startDate: startDate,
                endDate: endDate,
                date: `${startDate} - ${endDate}`,
                description: ''
            };
        } else if (currentExp) {
            if (!currentExp.role && line.length < 30 && !line.includes('：') && !line.includes(':') && !/^\d/.test(line)) {
                currentExp.role = line;
            } else {
                let cleanLine = line.trim().replace(/^[\*\-•·\d\.]+\s*/, '');
                if (cleanLine.length < 5) continue;

                let score = 0;
                const actionVerbs = ['负责', '主导', '设计', '实现', '优化', '重构', '提升', '降低', '节约', '管理', '带领', '从0到1', '搭建', '解决'];
                const metricsKeywords = ['%', '万', '亿', '倍', 'k', 'w', 'ms', 'MB', 'GB', 'TB', '用户', '收入', '性能'];
                const weakKeywords = ['协助', '参与', '了解', '学习', '维护', '配合'];

                if (actionVerbs.some(kw => cleanLine.includes(kw))) score += 20;
                if (metricsKeywords.some(kw => cleanLine.includes(kw) || /\d+/.test(cleanLine))) score += 30;
                if (weakKeywords.some(kw => cleanLine.includes(kw))) score -= 10;
                if (cleanLine.length >= 15 && cleanLine.length <= 50) score += 10;
                if (cleanLine.length < 10 || cleanLine.length > 80) score -= 10;

                if (!currentExp._candidates) currentExp._candidates = [];
                currentExp._candidates.push({ text: cleanLine, score });

                const topCandidates = currentExp._candidates
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 4);

                currentExp.description = topCandidates
                    .map(c => `• ${c.text}`)
                    .join('\n');
            }
        }
    }
    if (currentExp) {
        experience.push(currentExp);
    }

    return experience;
}

// 提取教育背景
function extractEducation(lines) {
    const education = [];
    const eduKeywords = ['教育背景', '教育经历', '学历', 'education', '学习经历', '毕业院校', '学校'];
    const eduIndex = lines.findIndex(line => isSectionHeader(line, eduKeywords));

    if (eduIndex === -1) return [];

    const eduEndIndex = findNextSectionIndex(lines, eduIndex + 1);
    const eduLines = lines.slice(eduIndex + 1, eduEndIndex);

    const schoolPatterns = [
        /[\u4e00-\u9fa5]*(大学|学院|学校|中学|高中|职业技术)/i,
        /University|College|Institute|School|Academy/i,
        /[\u4e00-\u9fa5]{2,}(师范|理工|科技|财经|医科|农业|林业|交通|外语|外国语)/i
    ];

    const degreePatterns = [
        /本科|硕士|博士|学士|研究生|专科|大专|MBA|EMBA|PhD|Master|Bachelor/i,
        /专业|系|方向|学位/,
        /计算机|软件|电子|机械|金融|会计|管理|设计|工程|法学|医学|教育/
    ];

    let currentEdu = null;

    // 增强的日期正则，支持多种连接符和格式
    const datePattern = /(\d{4})(?:\s*[\.年\/-]\s*(\d{1,2}))?[月]?\s*[-–至到~—]\s*(?:(\d{4})(?:\s*[\.年\/-]\s*(\d{1,2}))?[月]?|至今|现在|present|今)?[年]?(\d{1,2})?[月]?/i;

    // 学历关键词正则
    const degreeRegex = /(本科|硕士|博士|学士|研究生|专科|大专|MBA|EMBA|PhD|Master|Bachelor|双学位)/i;


    for (let i = 0; i < eduLines.length; i++) {
        const line = eduLines[i];
        const isSchool = schoolPatterns.some(pattern => pattern.test(line));
        const dateMatch = line.match(datePattern);

        if (isSchool || (dateMatch && !currentEdu)) {
            // 如果是新的一项（匹配到学校或日期且当前没有处理中的edu，或日期+学校这行）
            if (currentEdu && isSchool) {
                education.push(currentEdu);
                currentEdu = null;
            }

            if (!currentEdu) {
                currentEdu = {
                    id: Date.now() + i + 1000,
                    school: '',
                    degree: '',
                    date: ''
                };
            }

            // 1. 提取时间
            let cleanLine = line;
            if (dateMatch) {
                const startYear = dateMatch[1];
                const endYear = dateMatch[3] || '至今';
                // 仅当 currentEdu 目前没有时间时才更新，或者当前行包含学校名（权重高）
                if (!currentEdu.date || isSchool) {
                    currentEdu.date = `${startYear} - ${['今', '现在', 'present'].includes(endYear) || endYear.toLowerCase() === 'present' ? '至今' : endYear}`;
                }
                // 移除时间字符串，以便后续提取
                cleanLine = cleanLine.replace(dateMatch[0], ' ').trim();
            }

            // 2. 提取学历
            const degreeMatch = cleanLine.match(degreeRegex);
            if (degreeMatch) {
                // 如果当前没有学历，或者新匹配的更具体（在同一行）
                if (!currentEdu.degree) {
                    currentEdu.degree = degreeMatch[0];
                }
                // 移除学历，保留其他信息
                cleanLine = cleanLine.replace(degreeMatch[0], ' ').trim();
            }

            // 3. 提取学校（如果是学校行）
            if (isSchool) {
                // 移除常见的干扰词 "排名"、"GPA" 等
                cleanLine = cleanLine.replace(/排名[:：\s]*[前\d%]+/, '')
                    .replace(/GPA[:：\s]*[\d.]+/i, '')
                    .trim();

                // 简单的尝试拆分：支持空格、逗号、管道符
                // 移除括号内的内容（可能是专业或备注），先提纯学校名
                const parts = cleanLine.split(/[\s,，|｜]+/);

                // 寻找最像学校的那部分
                let bestSchoolPart = '';
                for (const part of parts) {
                    if (schoolPatterns.some(p => p.test(part))) {
                        bestSchoolPart = part;
                        break;
                    }
                }

                if (bestSchoolPart) {
                    currentEdu.school = bestSchoolPart;
                    // 移除学校后，剩下的可能是专业
                    // 需要清洗掉分隔符
                    currentEdu.major = cleanLine.replace(bestSchoolPart, '')
                        .replace(/[|｜]/g, ' ') // 移除管道符
                        .trim();
                } else {
                    // 没分出来，就整个作为学校，但在显示时可能包含杂质
                    currentEdu.school = cleanLine.replace(/[|｜]/g, ' ').trim();
                }
            } else if (!currentEdu.school && cleanLine.length > 4) {
                // 如果不是学校行，但可能是接在日期行后面的学校名
                // 暂且保留，或作为专业/描述收集
            }

        } else if (currentEdu) {
            // 处理非学校行（可能是独立的时间、学历、或专业描述）

            // 补漏：时间
            if (!currentEdu.date && dateMatch) {
                const startYear = dateMatch[1];
                const endYear = dateMatch[3] || '至今';
                currentEdu.date = `${startYear} - ${endYear}`;
            }

            // 补漏：学历
            const degreeMatch = line.match(degreeRegex);
            if (!currentEdu.degree && degreeMatch) {
                currentEdu.degree = degreeMatch[0];
            }

            // 补漏：专业（如果包含专业关键词）
            // 如果这行包含"专业"、"系"、"方向"
            if (/专业|系|方向/.test(line) && !currentEdu.major) {
                currentEdu.major = line.replace(/专业|系|方向/g, '').replace(/[:：]/, '').trim();
            }
        }
    }
    if (currentEdu) {
        education.push(currentEdu);
    }

    return education;
}

// 提取技能
function extractSkills(lines) {
    const skillKeywords = ['专业技能', '技能', '技术栈', 'skills', '擅长', '熟练掌握', '技术能力', '核心能力', '技能特长'];
    const skillIndex = lines.findIndex(line => isSectionHeader(line, skillKeywords));

    if (skillIndex !== -1) {
        const skillEndIndex = findNextSectionIndex(lines, skillIndex + 1);
        const skillLines = lines.slice(skillIndex + 1, skillEndIndex);
        const skillText = skillLines.join(' ');

        // 扩充的常见技能库，用于从长句中提取
        const EXTENDED_SKILLS = [
            ...COMMON_SKILLS,
            'MyBatis', 'SpringCloud', 'Dubbo', 'Zookeeper', 'Nacos', 'RocketMQ', 'Kafka', 'Elasticsearch',
            'Sass', 'Less', 'Tailwind', 'Ant Design', 'Element UI', 'Bootstrap',
            'Android', 'iOS', 'Flutter', 'React Native', 'Uni-app', 'Taro',
            'Linux', 'Unix', 'Shell', 'Bash', 'PowerShell',
            'Jenkins', 'GitLab CI', 'Travis CI', 'DevOps',
            'TensorFlow', 'PyTorch', 'Keras', 'OpenCV', 'NLP',
            'Jira', 'Confluence', '禅道'
        ];

        // 1. 优先匹配常见技能关键词
        const matchedSkills = EXTENDED_SKILLS.filter(skill =>
            // 使用正则匹配以确保单词边界（特别是英文）或者模糊匹配（中文）
            new RegExp(`(?<![a-zA-Z])${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-zA-Z])`, 'i').test(skillText) ||
            (skillText.toLowerCase().includes(skill.toLowerCase()) && /[\u4e00-\u9fa5]/.test(skill)) // 中文直接包含
        );

        // 2. 尝试从文本中分割提取补充技能
        const rawSplits = skillText
            .split(/[,，、;；|/\n•·◆]+/);

        const refinedSplits = rawSplits.map(s => {
            // 清洗修饰词
            let clean = s.trim()
                .replace(/^(熟练|精通|掌握|熟悉|了解|具备|具有|良好的|扎实的)/g, '')
                .replace(/(开发|编程|语言|技术|框架|工具|环境|系统|平台|原理|基础|能力|经验|应用)$/g, '') // 移除尾部通用词
                .replace(/[（(].*?[）)]/g, '') // 移除括号内容
                .trim();
            return clean;
        }).filter(s => {
            // 过滤条件
            if (!s) return false;
            // 排除纯数字、纯标点
            if (/^[\d.+\-:]+$/.test(s)) return false;
            // 长度限制
            if (s.length < 2 || s.length > 15) return false;
            // 排除太通用的词
            if (/^(编程|开发|维护|测试|设计|分析|管理|实施|文档)$/.test(s)) return false;
            // 排除已经是匹配到的技能
            if (matchedSkills.some(ms => ms.toLowerCase() === s.toLowerCase())) return false;

            return true;
        });

        // 合并结果，去重
        // 优先展示匹配到的知名技能，后面跟提取的补充技能
        // 优先展示匹配到的知名技能，后面跟提取的补充技能
        const allSkills = [...new Set([...matchedSkills, ...refinedSplits])];

        // 兜底：如果没提取到任何技能，尝试对整段文本进行更激进的关键词匹配
        if (allSkills.length === 0) {
            const fallbackSkills = COMMON_SKILLS.filter(skill =>
                skillText.toLowerCase().includes(skill.toLowerCase())
            );
            return fallbackSkills.slice(0, 12);
        }

        // 限制数量，避免太多
        return allSkills.slice(0, 18);
    } else {
        // 如果找不到技能段落，尝试全文匹配
        const fullText = lines.join(' ');
        // 也是用扩展列表
        const EXTENDED_SKILLS = [
            ...COMMON_SKILLS,
            'MyBatis', 'SpringCloud', 'Dubbo', 'Zookeeper', 'Nacos', 'RocketMQ', 'Kafka', 'Elasticsearch',
            'Android', 'iOS', 'Flutter',
            'Linux', 'Shell', 'Jenkins', 'DevOps'
        ];

        return EXTENDED_SKILLS.filter(skill =>
            fullText.toLowerCase().includes(skill.toLowerCase())
        ).slice(0, 12);
    }
}

// 提取项目经历
function extractProjects(lines) {
    const projects = [];
    const projKeywords = ['项目经历', '项目经验', '项目介绍', 'projects', 'project experience', 'project'];
    const projIndex = lines.findIndex(line => isSectionHeader(line, projKeywords));

    if (projIndex === -1) return [];

    const projEndIndex = findNextSectionIndex(lines, projIndex + 1);
    const projLines = lines.slice(projIndex + 1, projEndIndex);

    const datePattern = /(\d{4})(?:\s*[年./-]\s*(\d{1,2}))?[月]?\s*(?:[-–至到~—]|\s+-\s+)\s*(?:(\d{4})(?:\s*[年./-]\s*(\d{1,2}))?[月]?|至今|现在|present)?/i;
    let currentProj = null;

    for (let i = 0; i < projLines.length; i++) {
        const line = projLines[i];
        const dateMatch = line.match(datePattern);

        // 检测项目名称行（通常是较短的行，可能包含项目关键词）
        const isBulletLine = /^[◆]/.test(line);
        const cleanLineForCheck = line.replace(/^[•·◆\-\s]+/, ''); // 清理开头符号
        const isProjectName = isBulletLine || (line.length < 50 && !dateMatch &&
            (line.includes('项目') || line.includes('系统') || line.includes('平台') ||
                line.includes('APP') || line.includes('网站') || /^[A-Z]/.test(cleanLineForCheck)));

        if (dateMatch || isBulletLine) {
            if (currentProj) {
                projects.push(currentProj);
            }

            let startDate = '';
            let endDate = '';
            let remaining = line;

            if (dateMatch) {
                startDate = dateMatch[1] + (dateMatch[2] ? '.' + dateMatch[2].padStart(2, '0') : '');
                endDate = dateMatch[3] ? (dateMatch[3] + (dateMatch[4] ? '.' + dateMatch[4].padStart(2, '0') : '')) : '至今';
                remaining = line.replace(datePattern, '');
            }

            // 进一步清理剩余文本
            remaining = remaining.replace(/^[.。,，\-—|｜◆•·\s]+/, '').trim();

            let name = '';
            let role = '';

            // 1. 优先尝试管道符分隔
            if (/\||｜/.test(remaining)) {
                const parts = remaining.split(/[|｜]/).map(p => p.trim()).filter(p => p);

                // 如果是原来的格式： Date | Name | Role，Date已经被去掉了，所以剩下 Name | Role
                // 或者 Date pattern 没匹配到，但是是 ◆ Date | Name | Role
                // 需要智能判断 parts 里的内容

                // 暂时假设剩下的是 Name | Role
                if (parts.length >= 2) {
                    name = parts[0];
                    role = parts[1];
                } else if (parts.length === 1) {
                    name = parts[0];
                }
            } else {
                // 2. 回退：整段作为项目名称
                name = remaining;
                // 如果有多空格分隔，也尝试分割一下
                const spaceParts = remaining.split(/\s{2,}/).filter(p => p.trim());
                if (spaceParts.length >= 2) {
                    name = spaceParts[0];
                    role = spaceParts[1];
                    // 如果 dateMatch 没匹配到，但是第一段看起来像日期
                    if (!dateMatch && /^20\d{2}/.test(name)) {
                        // 可能是漏网的日期
                        // 简单处理，不强求提取日期了，把这部分作为时间或者名字都行
                    }
                }
            }

            // 修复：如果之前没提取到日期，但这是bullet line，尝试从 parts 里找日期？
            // 简单起见，如果这里没提取到日期，就留空，用户可以在界面填
            if (!startDate && !endDate) {
                // 尝试在 name 中寻找类似日期的字符串 (2020.01 - 2021.01)
                const looseDate = name.match(/(\d{4}[./-]\d{1,2})\s*-\s*(\d{4}[./-]\d{1,2}|至今|Present)/i);
                if (looseDate) {
                    startDate = looseDate[1];
                    endDate = looseDate[2];
                    name = name.replace(looseDate[0], '').trim();
                }
            }

            if (!name && i > 0) {
                name = projLines[i - 1];
            }

            currentProj = {
                id: Date.now() + i + 2000,
                name: name || '项目名称',
                role: role,
                startDate: startDate,
                endDate: endDate.toLowerCase().includes('至今') || endDate.includes('现在') ? '至今' : endDate,
                date: startDate ? `${startDate} - ${endDate}` : '',
                description: '',
                techStack: ''
            };
        } else if (isProjectName && !currentProj) {
            currentProj = {
                id: Date.now() + i + 2000,
                name: line,
                role: '',
                startDate: '',
                endDate: '',
                description: '',
                techStack: ''
            };
        } else if (currentProj) {
            // 检测技术栈行
            const techKeywords = ['技术栈', '技术', 'Tech', 'Stack', '使用技术', '开发技术'];
            if (techKeywords.some(kw => line.includes(kw))) {
                const colonIndex = line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':');
                if (colonIndex !== -1) {
                    currentProj.techStack = line.substring(colonIndex + 1).trim();
                } else {
                    currentProj.techStack = line;
                }
            } else if (!currentProj.role && line.length < 25 && !line.includes('：')) {
                currentProj.role = line;
            } else {
                let cleanLine = line.trim().replace(/^[\*\-•·\d\.]+\s*/, '');
                if (cleanLine.length >= 5) {
                    currentProj.description += (currentProj.description ? '\n' : '') + '• ' + cleanLine;
                }
            }
        }
    }
    if (currentProj) {
        projects.push(currentProj);
    }

    return projects;
}

// 提取证书荣誉 - 智能识别全文中带有证书相关字眼的内容
function extractCertifications(lines) {
    const certifications = [];
    const datePattern = /(\d{4})(?:\s*[年./-]\s*(\d{1,2}))?[月]?/;

    // 证书相关关键词
    const certKeywords = [
        '证书', '证', '资质', '资格', '执照', '认证', '等级', '职称',
        '荣誉', '获奖', '奖项', '奖励', '称号', '表彰',
        'certificate', 'certification', 'license', 'award', 'honor'
    ];

    // 常见证书名称模式
    const certPatterns = [
        /CET-?[46]/i,  // 英语四六级
        /雅思|IELTS|托福|TOEFL|GRE|GMAT/i,
        /PMP|PRINCE2|ACP|CSM/i,  // 项目管理
        /AWS|Azure|GCP|阿里云|腾讯云/i,  // 云认证
        /软考|系统分析师|架构师|网络工程师/i,
        /会计|CPA|ACCA|CFA|FRM/i,  // 财务
        /驾照|驾驶证|C1|C2/i,
        /一等奖|二等奖|三等奖|优秀|先进|杰出/i,
        /国家级|省级|市级|校级/i
    ];

    // 遍历所有行，查找包含证书关键词的行
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.length < 4 || line.length > 80) continue;

        // 跳过明显是标题的行
        if (line.endsWith('：') || line.endsWith(':')) continue;

        // 检查是否包含证书关键词或匹配证书模式
        const hasKeyword = certKeywords.some(kw => line.toLowerCase().includes(kw.toLowerCase()));
        const matchesPattern = certPatterns.some(pattern => pattern.test(line));

        if (hasKeyword || matchesPattern) {
            // 排除明显的标题行
            // 如果行里只包含"证书"、"荣誉"、"奖项"等关键词且长度很短，通常是小标题
            const cleanLine = line.replace(/[:：]/g, '').trim();
            // 增强正则：支持“荣誉证书”、“获奖证书”等组合词，以及“清单”、“列表”等后缀
            if (/^(在校|个人|专业)?(荣誉|证书|获奖|奖项|资质|认证|资格)+(经历|情况|列表|清单|汇总)?$/.test(cleanLine)) continue;
            if (/^(Certifications?|Awards?|Honors?|Qualifications?)$/i.test(cleanLine)) continue;

            // 提取日期
            const dateMatch = line.match(datePattern);
            let date = '';
            if (dateMatch) {
                date = dateMatch[1] + (dateMatch[2] ? '.' + dateMatch[2].padStart(2, '0') : '');
            }

            // 清洗证书名称
            let name = line;

            // 1. 移除日期
            name = name.replace(datePattern, '').trim();

            // 2. 移除常见的颁发机构模式（在括号中，或以"颁发"、"由"开头）
            name = name.replace(/[（(][^）)]+[）)]/g, '')  // 移除括号内容
                .replace(/通过了?/g, '')            // 移除"通过"或"通过了"
                .replace(/参加了?/g, '')            // 移除"参加"
                .replace(/获得/g, '')               // 移除"获得"
                .replace(/荣获/g, '')               // 移除"荣获"
                .replace(/被授予/g, '')             // 移除"被授予"
                .replace(/考取了?/g, '')            // 移除"考取"
                .replace(/证书编号[:：].+$/g, '')   // 移除证书编号
                .replace(/[\d]{10,}/g, '')          // 移除长数字编号
                .replace(/考试/g, '');              // 移除"考试"

            // 3. 移除分隔符后的内容（通常是机构名）
            name = name.split(/[:：\-—|]/)[0].trim();

            // 4. 移除尾部的"的证书"、"证书"（如果前面有具体名称）
            if (name.endsWith('的证书')) {
                name = name.substring(0, name.length - 3);
            } else if (name.endsWith('证书') && name.length > 5) {
                // 如果名字够长，尝试去掉"证书"后缀
                name = name.substring(0, name.length - 2);
            }

            // 5. 移除开头的标点、序号、"的"、"年"
            name = name.replace(/^[\d.、\s]+/, '')
                .replace(/^[年,，]+/, '')   // 移除开头的"年，"
                .replace(/^的/, '')
                .trim();

            // 6. 再次检查是否只剩下空或者纯数字
            if (!name || /^\d+$/.test(name) || name.length < 3) continue;

            // 7. 再次过滤掉像是标题的内容
            const blockList = [
                '荣誉', '证书', '奖项', '获奖', '在校荣誉', '个人荣誉', '校级证书',
                '荣誉证书', '获奖证书', '资格证书', '技能证书', '认证', '资质',
                '主要成就', '所获荣誉', '获奖经历', '证书列表'
            ];
            if (blockList.includes(name)) continue;

            // 5. 如果名字里还有"证书"二字，通常保留，但如果只有"证书"二字则忽略
            if (name === '证书' || name === '资格证书') continue;

            // 提取颁发机构（如果有明确的结构）
            // 在现在的逻辑中，我们大刀阔斧地砍掉了括号和分隔符后的内容，所以 issuer 可能很难从未清洗的 line 中提取准确
            // 但用户要求"不要把整个都带过来"，优先保证名字干净

            // 简单的机构提取尝试
            let issuer = '';
            const issuerMatch = line.match(/[（(]([^）)]+)[）)]/);
            if (issuerMatch) {
                const content = issuerMatch[1];
                // 如果括号里看起来像机构（不是日期或分数）
                if (!/[\d]{4}|分|级/.test(content) && content.length > 3) {
                    issuer = content;
                }
            }

            // 过滤掉太短或太通用的内容
            if (name && name.length >= 2 && name.length < 30) {
                // 避免重复添加
                const isDuplicate = certifications.some(c =>
                    c.name === name || c.name.includes(name) || name.includes(c.name)
                );
                if (!isDuplicate) {
                    certifications.push({
                        id: Date.now() + i + 3000,
                        name: name,
                        issuer: issuer,
                        date: date
                    });
                }
            }
        }
    }

    return certifications;
}

/**
 * 解析 DOCX 文本内容，提取简历信息
 * @param {string} text - DOCX 解析后的纯文本内容
 * @returns {Object} 解析后的简历数据
 */
export function parseDocxContent(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    // 基本信息提取
    const name = lines[0] || '未命名';
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    const phoneMatch = text.match(/1[3-9]\d{9}|(\d{3,4}[-\s]?\d{7,8})/);
    const websiteMatch = text.match(/(?:https?:\/\/)?(?:www\.)?[\w-]+\.[\w.-]+(?:\/[\w.-]*)?/gi);
    const locationMatch = text.match(/[\u4e00-\u9fa5]*(?:省|市|区|县|镇|路|街|号)[\u4e00-\u9fa5\d]*/);

    // 城市提取
    let city = '';
    const cityMatch = text.match(/(北京|上海|广州|深圳|杭州|南京|成都|武汉|西安|重庆|天津|苏州|郑州|长沙|东莞|青岛|沈阳|宁波|昆明|合肥|厦门|福州|济南|哈尔滨|大连|长春|无锡|佛山|石家庄|太原|南昌|贵阳|兰州|海口|三亚|珠海|中山|惠州|温州|常州|南宁|乌鲁木齐|呼和浩特|银川|西宁|拉萨|[\u4e00-\u9fa5]{2,4}市)/);
    if (cityMatch) {
        city = cityMatch[1].replace('市', '');
    }

    // 年龄提取
    let age = '';
    const agePatterns = [/(\d{1,2})\s*岁/, /年龄[：:]\s*(\d{1,2})/, /Age[：:]\s*(\d{1,2})/i];
    for (const pattern of agePatterns) {
        const match = text.match(pattern);
        if (match) {
            age = match[1];
            break;
        }
    }

    // 性别提取
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


    // 期望薪资提取
    let expectedSalary = '';
    const salaryPatterns = [
        /(?:期望薪资|薪资要求|薪资期望|Expected Salary)[：:]\s*([^\n\r]+)/i,
        /(\d+[-到]\d+[KkWw千万](?:[-/][\u4e00-\u9fa5]+)?)/, // 简单匹配 15-20K 这种格式
    ];

    for (const pattern of salaryPatterns) {
        const match = text.match(pattern);
        if (match) {
            // 如果是第一种模式，取捕获组；如果是第二种（直接匹配值），取整体
            expectedSalary = match[1] || match[0];
            // 清理一下可能包含的额外字符
            expectedSalary = expectedSalary.split(/[\s,，]/)[0].trim();
            break;
        }
    }
    let summary = '';
    const summaryKeywords = ['个人简介', '简介', '自我介绍', '个人介绍', 'profile', 'summary', '关于我', '自我评价', '个人总结'];
    const summaryIndex = lines.findIndex(line =>
        summaryKeywords.some(kw => line.toLowerCase().includes(kw.toLowerCase()))
    );
    if (summaryIndex !== -1) {
        const nextSectionIndex = findNextSectionIndex(lines, summaryIndex + 1);
        summary = lines.slice(summaryIndex + 1, nextSectionIndex).join(' ').substring(0, 500);
    }

    // 职位提取
    const title = extractTitle(lines, text);

    // 网站提取
    const website = (() => {
        const emailDomains = ['163.com', 'qq.com', 'gmail.com', 'outlook.com', 'hotmail.com', '126.com', 'sina.com', 'foxmail.com', 'yeah.net', 'sohu.com'];
        if (websiteMatch && websiteMatch.length > 0) {
            const validSite = websiteMatch.find(w =>
                !emailDomains.some(domain => w.toLowerCase() === domain || w.toLowerCase().endsWith('@' + domain))
                && (w.includes('http') || w.includes('www') || w.includes('/') || w.includes('-'))
            );
            return validSite || '';
        }
        return '';
    })();

    return {
        personal: {
            fullName: name,
            title: title || '职位待填写',
            email: emailMatch ? emailMatch[0] : '',
            phone: phoneMatch ? phoneMatch[0] : '',
            location: locationMatch ? locationMatch[0] : '',
            expectedSalary: expectedSalary,
            website: website,
            summary: summary,
            city: city,
            age: age,
            gender: gender
        },
        experience: extractExperience(lines),
        projects: extractProjects(lines),
        education: extractEducation(lines),
        skills: extractSkills(lines),
        certifications: extractCertifications(lines)
    };
}
