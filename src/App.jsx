import React, { useState, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import mammoth from 'mammoth';
import { Download, LayoutTemplate, Upload, FileDown, FileText, Palette, Columns, Monitor, Type } from 'lucide-react';
import JSZip from 'jszip';
import { initialResumeState } from './data/initialState';
import { parseDocxContent } from './utils/docxParser';
import Editor from './components/Editor';
import Preview from './components/Preview';

import { exportToDocx } from './utils/exportToDocx';

function App() {
  const [resumeData, setResumeData] = useState(() => {
    const saved = localStorage.getItem('resumeData');
    return saved ? JSON.parse(saved) : initialResumeState;
  });
  const [template, setTemplate] = useState(() => {
    return localStorage.getItem('resumeTemplate') || 'modern';
  });
  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('resumeColor') || '#4f46e5';
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const componentRef = useRef(null);
  const fileInputRef = useRef(null);

  // 监听数据变化，自动保存到 localStorage
  React.useEffect(() => {
    localStorage.setItem('resumeData', JSON.stringify(resumeData));
  }, [resumeData]);

  React.useEffect(() => {
    localStorage.setItem('resumeTemplate', template);
  }, [template]);

  React.useEffect(() => {
    localStorage.setItem('resumeColor', accentColor);
  }, [accentColor]);

  // 重置功能
  const handleReset = () => {
    if (window.confirm('⚠️ 确定要重置吗？\n\n这将清除当前的所有编辑内容（包括本地缓存），恢复到初始示例数据。\n此操作无法撤销！')) {
      localStorage.removeItem('resumeData');
      localStorage.removeItem('resumeTemplate');
      localStorage.removeItem('resumeColor');

      setResumeData(initialResumeState);
      setTemplate('modern');
      setAccentColor('#4f46e5');
    }
  };

  // 预设主题色
  const presetColors = [
    { name: '靛蓝', color: '#4f46e5' },
    { name: '紫罗兰', color: '#7c3aed' },
    { name: '玫红', color: '#db2777' },
    { name: '深红', color: '#dc2626' },
    { name: '橙色', color: '#ea580c' },
    { name: '翠绿', color: '#059669' },
    { name: '青色', color: '#0891b2' },
    { name: '深蓝', color: '#2563eb' },
    { name: '石墨', color: '#374151' },
  ];

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
      // 收集所有图片用于后续筛选
      const allImages = [];
      let debugImageInfo = '';

      try {
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



        // 总是尝试使用 JSZip 直接提取 (双重保障，防止 mammoth 解析出坏图或漏图)
        console.log("尝试使用 JSZip 提取图片作为补充...");
        try {
          const zip = await JSZip.loadAsync(arrayBuffer);
          // 辅助函数：根据文件头检测图片类型
          const checkFileSignature = (u8) => {
            if (!u8 || u8.length < 12) return null;

            // JPEG: FF D8 FF
            if (u8[0] === 0xFF && u8[1] === 0xD8 && u8[2] === 0xFF) return { ext: 'jpeg', mime: 'image/jpeg' };

            // PNG: 89 50 4E 47 0D 0A 1A 0A
            if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4E && u8[3] === 0x47) return { ext: 'png', mime: 'image/png' };

            // GIF: 47 49 46 38
            if (u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x38) return { ext: 'gif', mime: 'image/gif' };

            // BMP: 42 4D
            if (u8[0] === 0x42 && u8[1] === 0x4D) return { ext: 'bmp', mime: 'image/bmp' };

            // WebP: RIFF .... WEBP
            // 52 49 46 46 (0-3) ... 57 45 42 50 (8-11)
            if (u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46 &&
              u8[8] === 0x57 && u8[9] === 0x45 && u8[10] === 0x42 && u8[11] === 0x50) {
              return { ext: 'webp', mime: 'image/webp' };
            }

            return null;
          };

          const filePromises = [];

          zip.forEach((relativePath, file) => {
            if (file.dir) return;

            // 优先检查扩展名（为了性能）
            const ext = relativePath.toLowerCase().split('.').pop();
            const mimeTypes = {
              'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
              'png': 'image/png', 'gif': 'image/gif',
              'webp': 'image/webp', 'bmp': 'image/bmp',
              'svg': 'image/svg+xml'
            };

            // 如果有扩展名且匹配，直接使用
            if (mimeTypes[ext]) {
              filePromises.push(file.async("base64").then(b64 => ({
                data: `data:${mimeTypes[ext]};base64,${b64}`,
                contentType: mimeTypes[ext],
                fileName: relativePath
              })));
            } else {
              // 如果没有扩展名或不匹配，尝试读取文件头（Magic Bytes）
              const isExcludable = /\.(xml|rels|txt|json|css|js)$/i.test(relativePath);

              if (!isExcludable) {
                filePromises.push(file.async("uint8array").then(u8 => {
                  try {
                    const detected = checkFileSignature(u8);
                    if (detected) {
                      console.log(`通过签名发现图片: ${relativePath} -> ${detected.mime}`);
                      let binary = '';
                      const len = u8.byteLength;
                      // 简单处理，如果文件过大可能会慢，但通常简历图片不大
                      for (let i = 0; i < len; i++) {
                        binary += String.fromCharCode(u8[i]);
                      }
                      const b64 = window.btoa(binary);

                      return {
                        data: `data:${detected.mime};base64,${b64}`,
                        contentType: detected.mime,
                        fileName: relativePath
                      };
                    }
                  } catch (err) {
                    console.warn("检查文件签名失败:", relativePath, err);
                  }
                  return null;
                }));
              }
            }
          });

          if (filePromises.length > 0) {
            const extractedFiles = await Promise.all(filePromises);
            extractedFiles.forEach(f => allImages.push(f));
            console.log(`JSZip 成功提取 ${extractedFiles.length} 张图片`);
          }
        } catch (zipErr) {
          console.error("JSZip 提取失败:", zipErr);
        }


        // 智能选择头像：找最可能是人像的图片
        debugImageInfo = `检测到 ${allImages.length} 张图片`;
        if (allImages.length > 0) {
          // 简单的调试信息
          debugImageInfo += `: ${allImages.map(i => i.fileName || i.contentType).join(', ')}`;

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

            // 调试信息更新
            const validImages = imageWithSizes.filter(i => !i.error);
            debugImageInfo = `检测到${allImages.length}张, 有效${validImages.length}张`;
            if (validImages.length > 0) {
              debugImageInfo += ` (最高分: ${Math.max(...validImages.map(i => i.score))})`;
            }

            // 按分数排序，取分数最高的（即使分数不高也取，避免漏掉）
            const bestImage = imageWithSizes.sort((a, b) => b.score - a.score)[0];
            if (bestImage) {
              return bestImage.data;
            };
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
      // 应用所有解析到的数据
      setResumeData(prev => ({
        personal: { ...prev.personal, ...parsedData.personal },
        // 列表数据直接覆盖，以便用户知道解析结果（即使为空）
        experience: parsedData.experience,
        education: parsedData.education,
        skills: parsedData.skills,
        projects: parsedData.projects || [],  // 导入项目经历
        certifications: parsedData.certifications
      }));

      // 显示导入结果摘要
      const importSummary = [
        parsedData.personal.fullName ? `姓名: ${parsedData.personal.fullName}` : '',
        extractedPhoto ? '头像: ✓ 已提取' : `头像: ✗未检测到 (${debugImageInfo})\n   -> 建议: 文档图片格式特殊，请在左侧编辑器"手动上传"`,
        parsedData.experience.length > 0 ? `工作经历: ${parsedData.experience.length} 条` : '',
        parsedData.education.length > 0 ? `教育背景: ${parsedData.education.length} 条` : '',
        parsedData.certifications.length > 0 ? `证书荣誉: ${parsedData.certifications.length} 条` : '',
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

  const handleDownloadDocx = () => {
    exportToDocx(resumeData);
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
                onClick={handleReset}
                className="btn btn-ghost text-xs text-gray-400 hover:text-red-500 mr-2"
                title="清除缓存并恢复默认"
              >
                重置
              </button>

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
                onClick={handleDownloadDocx}
                className="btn btn-secondary flex gap-2"
                title="下载可编辑的 Word 文档"
              >
                <FileDown size={16} />
                <span>Word</span>
              </button>

              <button
                onClick={handleDownloadPDF}
                disabled={isExporting}
                className="btn btn-primary flex gap-2"
              >
                <Download size={16} />
                <span>{isExporting ? '导出中...' : 'PDF'}</span>
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

          {/* 第三行：颜色选择器 */}
          <div className="color-picker-section">
            <span className="color-picker-label">主题色：</span>
            <div className="color-picker-options">
              {presetColors.map(c => (
                <button
                  key={c.color}
                  onClick={() => setAccentColor(c.color)}
                  className={`color-dot ${accentColor === c.color ? 'active' : ''}`}
                  style={{ backgroundColor: c.color }}
                  title={c.name}
                />
              ))}
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="color-input-custom"
                title="自定义颜色"
              />
            </div>
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
          <div className="a4-wrapper shadow-lg" style={{ '--resume-accent': accentColor }}>
            <Preview ref={componentRef} data={resumeData} template={template} accentColor={accentColor} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
