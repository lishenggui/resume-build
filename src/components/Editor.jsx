import React, { useState, useRef } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Camera, X } from 'lucide-react';

const SkillsInput = ({ initialSkills, onUpdate }) => {
    const [value, setValue] = useState(initialSkills.join(', '));

    const handleBlur = () => {
        const skillsArray = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
        onUpdate(skillsArray);
    };

    return (
        <textarea
            rows={4}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            className="form-input resize-none"
            placeholder="Figma, React, Design Systems..."
        />
    );
};

const Editor = ({ data, updatePersonal, setResumeData }) => {
    const [activeSection, setActiveSection] = useState('personal');
    const photoInputRef = useRef(null);

    const toggleSection = (section) => {
        setActiveSection(activeSection === section ? null : section);
    };

    // 处理照片上传
    const handlePhotoUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }

        // 验证文件大小 (最大 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('图片大小不能超过 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            updatePersonal('photo', e.target.result);
        };
        reader.readAsDataURL(file);
    };

    const removePhoto = () => {
        updatePersonal('photo', '');
        if (photoInputRef.current) {
            photoInputRef.current.value = '';
        }
    };

    const handleExpChange = (id, field, value) => {
        setResumeData(prev => ({
            ...prev,
            experience: prev.experience.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        }));
    };

    const addExperience = () => {
        const newExp = {
            id: Date.now(),
            company: '新公司',
            role: '职位',
            date: '时间段',
            description: '工作描述...'
        };
        setResumeData(prev => ({
            ...prev,
            experience: [newExp, ...prev.experience]
        }));
    };

    const removeExperience = (id) => {
        setResumeData(prev => ({
            ...prev,
            experience: prev.experience.filter(item => item.id !== id)
        }));
    };

    // Generic helper for Education would be similar... skipping for brevity slightly but included in robustness

    const SectionHeader = ({ title, sectionKey }) => (
        <div
            className="section-header"
            onClick={() => toggleSection(sectionKey)}
        >
            <h3>{title}</h3>
            {activeSection === sectionKey ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
    );

    return (
        <div className="editor-container">

            {/* Personal Section */}
            <section className="editor-section">
                <SectionHeader title="个人信息" sectionKey="personal" />

                {activeSection === 'personal' && (
                    <div className="editor-form-grid">
                        {/* Photo Upload */}
                        <div className="form-group">
                            <label className="form-label">头像照片</label>
                            <input
                                type="file"
                                ref={photoInputRef}
                                onChange={handlePhotoUpload}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                            <div className="photo-upload-area">
                                {data.personal.photo ? (
                                    <div className="photo-preview">
                                        <img src={data.personal.photo} alt="头像预览" />
                                        <button
                                            type="button"
                                            onClick={removePhoto}
                                            className="photo-remove-btn"
                                            title="移除照片"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => photoInputRef.current?.click()}
                                        className="photo-upload-btn"
                                    >
                                        <Camera size={24} />
                                        <span>上传头像</span>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">姓名</label>
                            <input
                                type="text"
                                value={data.personal.fullName}
                                onChange={(e) => updatePersonal('fullName', e.target.value)}
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">职位/头衔</label>
                            <input
                                type="text"
                                value={data.personal.title}
                                onChange={(e) => updatePersonal('title', e.target.value)}
                                className="form-input"
                            />
                        </div>
                        <div className="form-row">
                            <div>
                                <label className="form-label">邮箱</label>
                                <input
                                    type="text"
                                    value={data.personal.email}
                                    onChange={(e) => updatePersonal('email', e.target.value)}
                                    className="form-input"
                                />
                            </div>
                            <div>
                                <label className="form-label">电话</label>
                                <input
                                    type="text"
                                    value={data.personal.phone}
                                    onChange={(e) => updatePersonal('phone', e.target.value)}
                                    className="form-input"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">所在地</label>
                            <input
                                type="text"
                                value={data.personal.location}
                                onChange={(e) => updatePersonal('location', e.target.value)}
                                className="form-input"
                            />
                        </div>
                        <div className="form-row form-row-3">
                            <div>
                                <label className="form-label">城市</label>
                                <input
                                    type="text"
                                    value={data.personal.city || ''}
                                    onChange={(e) => updatePersonal('city', e.target.value)}
                                    className="form-input"
                                    placeholder="北京"
                                />
                            </div>
                            <div>
                                <label className="form-label">年龄</label>
                                <input
                                    type="text"
                                    value={data.personal.age || ''}
                                    onChange={(e) => updatePersonal('age', e.target.value)}
                                    className="form-input"
                                    placeholder="28"
                                />
                            </div>
                            <div>
                                <label className="form-label">性别</label>
                                <select
                                    value={data.personal.gender || ''}
                                    onChange={(e) => updatePersonal('gender', e.target.value)}
                                    className="form-input"
                                >
                                    <option value="">请选择</option>
                                    <option value="男">男</option>
                                    <option value="女">女</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="form-label">个人简介</label>
                            <textarea
                                rows={4}
                                value={data.personal.summary}
                                onChange={(e) => updatePersonal('summary', e.target.value)}
                                className="form-input resize-none"
                            />
                        </div>
                    </div>
                )}
            </section>

            {/* Experience Section */}
            <section className="editor-section">
                <div className="section-header" onClick={() => toggleSection('experience')}>
                    <div className="flex items-center gap-2">
                        <h3>工作经历</h3>
                        {activeSection === 'experience' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); addExperience(); }} className="btn-icon bg-[var(--color-studio-panel)] hover:bg-[var(--color-studio-border)]">
                        <Plus size={16} />
                    </button>
                </div>

                {activeSection === 'experience' && (
                    <div className="editor-form-grid">
                        {data.experience.map((exp) => (
                            <div key={exp.id} className="item-card">
                                <div className="item-actions">
                                    <button onClick={() => removeExperience(exp.id)} className="text-danger">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <input
                                        type="text"
                                        placeholder="公司名称"
                                        value={exp.company}
                                        onChange={(e) => handleExpChange(exp.id, 'company', e.target.value)}
                                        className="form-input font-bold"
                                    />
                                    <div className="form-row">
                                        <input
                                            type="text"
                                            placeholder="职位"
                                            value={exp.role}
                                            onChange={(e) => handleExpChange(exp.id, 'role', e.target.value)}
                                            className="form-input"
                                        />
                                        <input
                                            type="text"
                                            placeholder="时间段"
                                            value={exp.date}
                                            onChange={(e) => handleExpChange(exp.id, 'date', e.target.value)}
                                            className="form-input text-sm"
                                        />
                                    </div>
                                    <textarea
                                        placeholder="工作描述"
                                        rows={3}
                                        value={exp.description}
                                        onChange={(e) => handleExpChange(exp.id, 'description', e.target.value)}
                                        className="form-input text-sm resize-none"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Education Section */}
            <section className="editor-section">
                <div className="section-header" onClick={() => toggleSection('education')}>
                    <div className="flex items-center gap-2">
                        <h3>教育经历</h3>
                        {activeSection === 'education' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    <button onClick={(e) => {
                        e.stopPropagation();
                        setResumeData(prev => ({
                            ...prev,
                            education: [{ id: Date.now(), school: '新学校', degree: '学历/学位', date: '时间段' }, ...prev.education]
                        }))
                    }} className="btn-icon bg-[var(--color-studio-panel)] hover:bg-[var(--color-studio-border)]">
                        <Plus size={16} />
                    </button>
                </div>

                {activeSection === 'education' && (
                    <div className="editor-form-grid">
                        {data.education.map((edu) => (
                            <div key={edu.id} className="item-card">
                                <div className="item-actions">
                                    <button onClick={() => {
                                        setResumeData(prev => ({
                                            ...prev,
                                            education: prev.education.filter(item => item.id !== edu.id)
                                        }))
                                    }} className="text-danger">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <input
                                        type="text"
                                        placeholder="学校名称"
                                        value={edu.school}
                                        onChange={(e) => {
                                            setResumeData(prev => ({
                                                ...prev,
                                                education: prev.education.map(item => item.id === edu.id ? { ...item, school: e.target.value } : item)
                                            }))
                                        }}
                                        className="form-input font-bold"
                                    />
                                    <div className="form-row">
                                        <input
                                            type="text"
                                            placeholder="学历/学位"
                                            value={edu.degree}
                                            onChange={(e) => {
                                                setResumeData(prev => ({
                                                    ...prev,
                                                    education: prev.education.map(item => item.id === edu.id ? { ...item, degree: e.target.value } : item)
                                                }))
                                            }}
                                            className="form-input"
                                        />
                                        <input
                                            type="text"
                                            placeholder="时间段"
                                            value={edu.date}
                                            onChange={(e) => {
                                                setResumeData(prev => ({
                                                    ...prev,
                                                    education: prev.education.map(item => item.id === edu.id ? { ...item, date: e.target.value } : item)
                                                }))
                                            }}
                                            className="form-input text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Skills Section */}
            <section className="editor-section">
                <SectionHeader title="专业技能" sectionKey="skills" />
                {activeSection === 'skills' && (
                    <div className="editor-form-grid">
                        <div className="form-group">
                            <label className="form-label">技能列表 (逗号分隔)</label>
                            <SkillsInput
                                initialSkills={data.skills}
                                onUpdate={(newSkills) => setResumeData(prev => ({ ...prev, skills: newSkills }))}
                            />
                        </div>
                    </div>
                )}
            </section>

        </div>
    );
};

export default Editor;
