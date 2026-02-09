
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun } from "docx";
import { saveAs } from "file-saver";

export const exportToDocx = async (data, t) => {
    const { personal, experience, projects, education, skills, certifications } = data;


    // 辅助函数：base64 转 Uint8Array
    const convertBase64ToUint8Array = (base64String) => {
        try {
            // 更稳健的方式：根据逗号分割，取第二部分
            const arr = base64String.split(',');
            const base64Data = arr.length > 1 ? arr[1] : arr[0];

            // 处理可能的空格或换行
            const cleanBase64 = base64Data.replace(/\s/g, '');

            const binaryString = window.atob(cleanBase64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        } catch (e) {
            console.error("图片转换失败", e);
            alert(`导出错误：图片转换失败 - ${e.message} `);
            return null;
        }
    };

    // 辅助函数：创建带下划线的标题
    const createSectionTitle = (text) => {
        return new Paragraph({
            text: text,
            heading: HeadingLevel.HEADING_2,
            thematicBreak: true, // 下方加横线
            spacing: {
                before: 200,
                after: 100,
            },
            border: {
                bottom: {
                    color: "auto",
                    space: 1,
                    value: BorderStyle.SINGLE,
                    size: 6,
                },
            },
        });
    };

    // 辅助函数：处理换行文本
    const createTextParagraphs = (text) => {
        if (!text) return [];
        return text.split('\n').map(line => new Paragraph({
            text: line,
            spacing: { line: 240 }, // 行高
            bullet: { level: 0 } //以此作为列表项
        }));
    };

    // 简单的文本段落
    const createSimpleParagraph = (text) => {
        return new Paragraph({
            children: [new TextRun({ text: text || '', size: 22 })], // 11pt
            spacing: { line: 240 }
        });
    };

    // 新增：创建带符号的单行条目（模仿用户模板：◆ 时间  公司  职位）
    const createBulletItem = (text, isBold = false) => {
        return new Paragraph({
            children: [
                new TextRun({
                    text: `◆ ${text} `,
                    bold: isBold,
                    size: 24, // 12pt
                })
            ],
            spacing: { line: 360, before: 100 }, // 行间距稍大一点
            indent: { left: 420, hanging: 420 } // 悬挂缩进
        });
    };

    // 新增：创建普通单行条目（用于教育，不带符号但对齐）
    const createLineItem = (text, isBold = false) => {
        return new Paragraph({
            children: [new TextRun({ text: text, bold: isBold, size: 24 })],
            spacing: { line: 360, before: 100 }
        });
    };




    const sections = [];

    // --- 1. 头部信息 ---
    // 如果有头像，先添加头像
    let imageBuffer = null;
    if (personal.photo) {
        try {
            imageBuffer = convertBase64ToUint8Array(personal.photo);
        } catch (e) {
            console.error("处理图片数据失败", e);
        }
    }

    if (imageBuffer) {
        sections.push(

            new Paragraph({
                children: [
                    new ImageRun({
                        data: imageBuffer,
                        transformation: {
                            width: 100,
                            height: 120,
                        },
                    }),
                ],
                alignment: AlignmentType.CENTER,
            }),
        );
    }

    const contactInfo = [
        personal.email,
        personal.phone,
        personal.city,
        personal.age ? `${personal.age} ${t ? (t('fields.age_unit') || '') : ''}` : '', // Handle age unit if needed, specifically asked for i18n
        personal.experience ? `${personal.experience} ${t ? (t('fields.years_exp') || '') : ''}` : ''
    ].filter(Boolean).join("  |  ");

    sections.push(
        new Paragraph({
            text: personal.fullName,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: personal.title || '',
                    size: 24,
                    bold: true,
                })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
        }),
        new Paragraph({
            children: [new TextRun({ text: contactInfo, size: 20 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        })
    );

    if (personal.expectedSalary) {
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({ text: `${t ? t('fields.expectedSalary') : '期望薪资'}: ${personal.expectedSalary} `, size: 20, bold: true })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
            })
        );
    }

    // --- 2. 个人简介 ---
    if (personal.summary) {
        sections.push(createSectionTitle(t ? t('editor.summary') : "个人简介"));
        sections.push(new Paragraph({
            children: [new TextRun({ text: personal.summary, size: 22 })],
            spacing: { line: 240, after: 200 }
        }));
    }

    // --- 3. 工作经历 ---
    if (experience && experience.length > 0) {
        sections.push(createSectionTitle(t ? t('editor.experience') : "工作经历"));
        experience.forEach(exp => {
            // 格式：◆ 时间   公司   职位
            const date = exp.date || (t ? t('common.present') : '至今');
            const company = exp.company || '';
            const role = exp.role || '';

            // 使用管道符作为明确的分隔符，便于解析和阅读
            const lineText = `${date}  | ${company}  | ${role} `;
            sections.push(createBulletItem(lineText, true));

            if (exp.description) {
                const lines = exp.description.split('\n').filter(l => l.trim());
                lines.forEach(line => {
                    sections.push(new Paragraph({
                        text: line.replace(/^[•·-]\s*/, ''), // 移除已有的符号，使用word的bullet
                        bullet: { level: 0 },
                        indent: { left: 800 }, // 缩进更多一点
                        spacing: { line: 240 }
                    }));
                });
            }
            sections.push(new Paragraph({ text: "", spacing: { after: 100 } })); // 间距
        });
    }

    // --- 4. 项目经历 ---
    if (projects && projects.length > 0) {
        sections.push(createSectionTitle(t ? t('editor.projects') : "项目经历"));
        projects.forEach(proj => {
            // 格式：◆ 时间   项目名称   角色
            const date = proj.date || ''; // 注意项目数据里可能没有直接的 date 字段，如果有就用
            // 构造时间字符串
            let timeStr = '';
            if (proj.startDate) {
                timeStr = `${proj.startDate}${proj.endDate ? ' - ' + proj.endDate : ''} `;
            } else {
                timeStr = date;
            }

            const lineText = `${timeStr}  | ${proj.name || ''}  | ${proj.role ? proj.role : ''} `;

            sections.push(createBulletItem(lineText.trim(), true));

            if (proj.techStack) {
                sections.push(new Paragraph({
                    text: `${t ? (t('fields.techStack') || '技术栈') : '技术栈'}: ${proj.techStack} `,
                    indent: { left: 800 },
                    spacing: { line: 240 }
                }));
            }

            if (proj.description) {
                const lines = proj.description.split('\n').filter(l => l.trim());
                lines.forEach(line => {
                    sections.push(new Paragraph({
                        text: line.replace(/^[•·-]\s*/, ''),
                        bullet: { level: 0 },
                        indent: { left: 800 },
                        spacing: { line: 240 }
                    }));
                });
            }
            sections.push(new Paragraph({ text: "", spacing: { after: 100 } }));
        });
    }

    // --- 5. 教育背景 ---
    if (education && education.length > 0) {
        sections.push(createSectionTitle(t ? t('editor.education') : "教育背景"));
        education.forEach(edu => {
            // 格式：时间   学校   专业   学历
            const parts = [
                edu.date || '',
                edu.school || '',
                edu.major || '',
                edu.degree || ''
            ].filter(Boolean);

            sections.push(createLineItem(parts.join('  |  '), true));
            sections.push(new Paragraph({ text: "", spacing: { after: 50 } }));
        });
    }

    // --- 6. 技能列表 ---
    if (skills && skills.length > 0) {
        sections.push(createSectionTitle(t ? t('editor.skills') : "专业技能"));
        // 模仿模板：使用 ◆ 列表
        skills.forEach(skill => {
            sections.push(createBulletItem(skill, false));
        });
        sections.push(new Paragraph({ text: "", spacing: { after: 100 } }));
    }

    // --- 7. 证书 ---
    if (certifications && certifications.length > 0) {
        sections.push(createSectionTitle(t ? t('editor.certifications') : "荣誉证书"));
        const certList = certifications.map(c => {
            const parts = [c.name, c.date, c.issuer].filter(Boolean);
            return parts.join(' - ');
        });

        certList.forEach(cert => {
            sections.push(new Paragraph({
                text: cert,
                bullet: { level: 0 },
                spacing: { line: 240 }
            }));
        });
    }


    // 生成文档
    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 1000, // dxa (twips)
                        right: 1000,
                        bottom: 1000,
                        left: 1000,
                    },
                },
            },
            children: sections,
        }],
    });

    Packer.toBlob(doc).then((blob) => {
        saveAs(blob, `${personal.fullName || '简历'} _Resume.docx`);
    });
};
