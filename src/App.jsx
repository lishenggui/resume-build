import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import html2pdf from 'html2pdf.js';
import mammoth from 'mammoth';
import { Download, LayoutTemplate, Upload, FileDown, FileText, Palette, Columns, Monitor, Type, Globe, RotateCcw } from 'lucide-react';
import JSZip from 'jszip';
import { initialResumeState } from './data/initialState';
import { initialResumeStateEn } from './data/initialStateEn';
import { parseDocxContent } from './utils/docxParser';
import Editor from './components/Editor';
import Preview from './components/Preview';
import Modal from './components/Modal';

import { exportToDocx } from './utils/exportToDocx';

function App() {
  const { t, i18n } = useTranslation();
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

  // 弹窗状态管理
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info', // info, warning, error, success
    onConfirm: null,
    confirmText: '确定'
  });

  // 辅助函数：关闭弹窗
  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  // 辅助函数：显示提示
  const showModal = (options) => {
    setModalConfig({
      isOpen: true,
      onClose: closeModal,
      ...options
    });
  };

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
    showModal({
      title: t('modal.reset_confirm_title'),
      message: t('modal.reset_confirm_message'),
      type: 'warning',
      confirmText: t('modal.reset_btn'),
      onConfirm: () => {
        localStorage.removeItem('resumeData');
        localStorage.removeItem('resumeTemplate');
        localStorage.removeItem('resumeColor');

        const initialState = i18n.language.startsWith('en') ? initialResumeStateEn : initialResumeState;
        setResumeData(initialState);
        setTemplate('modern');
        setAccentColor('#4f46e5');

        // 重置后显示成功提示
        setTimeout(() => {
          showModal({
            title: t('modal.reset_success_title'),
            message: t('modal.reset_success_message'),
            type: 'success',
            confirmText: t('modal.known')
          });
        }, 300);
      }
    });
  };

  // 切换语言
  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  // 预设主题色
  const presetColors = [
    { name: t('app.theme_color') + ' Indigo', color: '#4f46e5' },
    { name: 'Purple', color: '#7c3aed' },
    { name: 'Pink', color: '#db2777' },
    { name: 'Red', color: '#dc2626' },
    { name: 'Orange', color: '#ea580c' },
    { name: 'Emerald', color: '#059669' },
    { name: 'Cyan', color: '#0891b2' },
    { name: 'Blue', color: '#2563eb' },
    { name: 'Gray', color: '#374151' },
  ];

  const handleImportDocx = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型 - mammoth 只支持 .docx 格式
    if (file.name.endsWith('.doc') && !file.name.endsWith('.docx')) {
      showModal({
        title: t('modal.format_unsupported_title'),
        message: t('modal.format_unsupported_message'),
        type: 'warning',
        confirmText: t('modal.known')
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!file.name.endsWith('.docx')) {
      showModal({
        title: t('modal.format_error_title'),
        message: t('modal.format_error_message'),
        type: 'error',
        confirmText: t('modal.known')
      });
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
        parsedData.personal.fullName ? `${t('fields.fullName')}: ${parsedData.personal.fullName}` : '',
        extractedPhoto ? `${t('editor.personal')}: ✓ ${t('modal.import_success_title')}` : `${t('editor.personal')}: ✗ (${debugImageInfo})`,
        parsedData.experience.length > 0 ? `${t('editor.experience')}: ${parsedData.experience.length}` : '',
        parsedData.education.length > 0 ? `${t('editor.education')}: ${parsedData.education.length}` : '',
        parsedData.certifications.length > 0 ? `${t('editor.certifications')}: ${parsedData.certifications.length}` : '',
        parsedData.skills.length > 0 ? `${t('editor.skills')}: ${parsedData.skills.length}` : ''
      ].filter(Boolean).join('\n');

      showModal({
        title: t('modal.import_success_title'),
        message: t('modal.import_success_message', { summary: importSummary }),
        type: 'success',
        confirmText: t('modal.known')
      });
    } catch (error) {
      console.error('导入失败:', error);
      showModal({
        title: t('modal.import_fail_title'),
        message: `${error.message || 'Error'}\n\n1. .docx\n2. Word\n3. File check`, // 简化错误信息，或进一步翻译
        type: 'error',
        confirmText: t('modal.known')
      });
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
    exportToDocx(resumeData, t);
  };

  const updatePersonal = (field, value) => {
    setResumeData(prev => ({
      ...prev,
      personal: { ...prev.personal, [field]: value }
    }));
  };

  return (
    <div className="app-container flex">
      <Modal {...modalConfig} />
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
            <h1>{t('app.title')}</h1>
            <div className="header-actions">
              <button
                onClick={toggleLanguage}
                className="btn btn-ghost btn-icon-only text-gray-400 hover:text-white mr-2"
                title="Switch Language"
              >
                <Globe size={18} />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="btn btn-secondary flex gap-2 px-3"
                title={t('app.import')}
              >
                <Upload size={16} />
                <span className="hidden sm:inline">{t('app.import')}</span>
              </button>

              <button
                onClick={handleDownloadDocx}
                className="btn btn-secondary flex gap-2 px-3"
                title={t('app.download_word')}
              >
                <FileDown size={16} />
                <span className="hidden sm:inline">Word</span>
              </button>

              <button
                onClick={handleDownloadPDF}
                disabled={isExporting}
                className="btn btn-primary flex gap-2 px-3"
              >
                <Download size={16} />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
          </div>

          {/* 第二行：模板选择器 */}
          <div className="template-switcher">
            {[
              { id: 'modern', name: 'modern', icon: Monitor },
              { id: 'classic', name: 'classic', icon: FileText },
              { id: 'sidebar', name: 'sidebar', icon: Columns },
              { id: 'creative', name: 'creative', icon: Palette },
              { id: 'minimal', name: 'minimal', icon: Type },
            ].map(tItem => (
              <button
                key={tItem.id}
                onClick={() => setTemplate(tItem.id)}
                className={`template-btn ${template === tItem.id ? 'active' : ''}`}
                title={t(`app.template.${tItem.name}`)}
              >
                <tItem.icon size={16} />
                <span>{t(`app.template.${tItem.name}`)}</span>
              </button>
            ))}
          </div>

          {/* 第三行：颜色选择器 */}
          <div className="color-picker-section">
            <span className="color-picker-label">{t('app.theme_color')}</span>
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

        <footer className="editor-footer">
          <button
            onClick={handleReset}
            className="btn btn-ghost text-xs text-gray-400 hover:text-red-500 w-full justify-center"
            title={t('app.reset')}
          >
            <RotateCcw size={14} />
            <span>{t('app.reset')}</span>
          </button>
        </footer>
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
