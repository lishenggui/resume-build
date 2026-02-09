import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ChevronDown, ChevronUp, Camera, X, GripVertical } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 可排序项目包装组件
const SortableItem = ({ id, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="sortable-item">
            <div className="drag-handle" {...attributes} {...listeners}>
                <GripVertical size={16} />
            </div>
            {children}
        </div>
    );
};

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
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState('personal');
    const photoInputRef = useRef(null);

    // 拖拽排序传感器配置
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

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

    // 工作经历相关操作
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

    // 项目经历相关操作
    const handleProjectChange = (id, field, value) => {
        setResumeData(prev => ({
            ...prev,
            projects: prev.projects.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        }));
    };

    const addProject = () => {
        const newProject = {
            id: Date.now(),
            name: '新项目',
            role: '角色',
            date: '时间',
            description: '项目描述...',
            techStack: '技术栈'
        };
        setResumeData(prev => ({
            ...prev,
            projects: [newProject, ...(prev.projects || [])]
        }));
    };

    const removeProject = (id) => {
        setResumeData(prev => ({
            ...prev,
            projects: prev.projects.filter(item => item.id !== id)
        }));
    };

    // 证书荣誉相关操作
    const handleCertChange = (id, field, value) => {
        setResumeData(prev => ({
            ...prev,
            certifications: prev.certifications.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        }));
    };

    const addCertification = () => {
        const newCert = {
            id: Date.now(),
            name: '证书名称',
            issuer: '颁发机构',
            date: '获得时间'
        };
        setResumeData(prev => ({
            ...prev,
            certifications: [newCert, ...(prev.certifications || [])]
        }));
    };

    const removeCertification = (id) => {
        setResumeData(prev => ({
            ...prev,
            certifications: prev.certifications.filter(item => item.id !== id)
        }));
    };

    // 通用拖拽结束处理函数
    const handleDragEnd = (event, listKey) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setResumeData(prev => {
                const oldIndex = prev[listKey].findIndex(item => item.id === active.id);
                const newIndex = prev[listKey].findIndex(item => item.id === over.id);

                return {
                    ...prev,
                    [listKey]: arrayMove(prev[listKey], oldIndex, newIndex)
                };
            });
        }
    };

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
                <SectionHeader title={t('editor.personal')} sectionKey="personal" />

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
                                        <span>{t('editor.upload_photo')}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('fields.fullName')}</label>
                            <input
                                type="text"
                                value={data.personal.fullName}
                                onChange={(e) => updatePersonal('fullName', e.target.value)}
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('fields.title')}</label>
                            <input
                                type="text"
                                value={data.personal.title}
                                onChange={(e) => updatePersonal('title', e.target.value)}
                                className="form-input"
                            />
                        </div>
                        <div className="form-row">
                            <div>
                                <label className="form-label">{t('fields.email')}</label>
                                <input
                                    type="text"
                                    value={data.personal.email}
                                    onChange={(e) => updatePersonal('email', e.target.value)}
                                    className="form-input"
                                />
                            </div>
                            <div>
                                <label className="form-label">{t('fields.phone')}</label>
                                <input
                                    type="text"
                                    value={data.personal.phone}
                                    onChange={(e) => updatePersonal('phone', e.target.value)}
                                    className="form-input"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">{t('fields.location')}</label>
                            <input
                                type="text"
                                value={data.personal.location}
                                onChange={(e) => updatePersonal('location', e.target.value)}
                                className="form-input"
                            />
                        </div>
                        <div className="form-row form-row-3">
                            <div>
                                <label className="form-label">{t('fields.location')}</label>
                                <input
                                    type="text"
                                    value={data.personal.city || ''}
                                    onChange={(e) => updatePersonal('city', e.target.value)}
                                    className="form-input"
                                    placeholder="Beijing"
                                />
                            </div>
                            <div>
                                <label className="form-label">{t('fields.age')}</label>
                                <input
                                    type="text"
                                    value={data.personal.age || ''}
                                    onChange={(e) => updatePersonal('age', e.target.value)}
                                    className="form-input"
                                    placeholder="28"
                                />
                            </div>
                            <div>
                                <label className="form-label">{t('fields.gender')}</label>
                                <select
                                    value={data.personal.gender || ''}
                                    onChange={(e) => updatePersonal('gender', e.target.value)}
                                    className="form-input"
                                >
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="form-label">{t('fields.expectedSalary')}</label>
                            <input
                                type="text"
                                value={data.personal.expectedSalary || ''}
                                onChange={(e) => updatePersonal('expectedSalary', e.target.value)}
                                className="form-input"
                                placeholder="15-20K"
                            />
                        </div>
                        <div>
                            <label className="form-label">{t('editor.summary')}</label>
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
                        <h3>{t('editor.experience')}</h3>
                        {activeSection === 'experience' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); addExperience(); }} className="btn-icon bg-[var(--color-studio-panel)] hover:bg-[var(--color-studio-border)]">
                        <Plus size={16} />
                    </button>
                </div>

                {activeSection === 'experience' && (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEnd(e, 'experience')}
                    >
                        <SortableContext
                            items={data.experience.map(exp => exp.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="editor-form-grid">
                                {data.experience.map((exp) => (
                                    <SortableItem key={exp.id} id={exp.id}>
                                        <div className="item-card">
                                            <div className="item-actions">
                                                <button onClick={() => removeExperience(exp.id)} className="text-danger">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                <input
                                                    type="text"
                                                    placeholder={t('fields.company')}
                                                    value={exp.company}
                                                    onChange={(e) => handleExpChange(exp.id, 'company', e.target.value)}
                                                    className="form-input font-bold"
                                                />
                                                <div className="form-row">
                                                    <input
                                                        type="text"
                                                        placeholder={t('fields.position')}
                                                        value={exp.role}
                                                        onChange={(e) => handleExpChange(exp.id, 'role', e.target.value)}
                                                        className="form-input"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder={t('fields.date')}
                                                        value={exp.date}
                                                        onChange={(e) => handleExpChange(exp.id, 'date', e.target.value)}
                                                        className="form-input text-sm"
                                                    />
                                                </div>
                                                <textarea
                                                    placeholder={t('fields.description')}
                                                    rows={3}
                                                    value={exp.description}
                                                    onChange={(e) => handleExpChange(exp.id, 'description', e.target.value)}
                                                    className="form-input text-sm resize-none"
                                                />
                                            </div>
                                        </div>
                                    </SortableItem>
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </section>

            {/* Projects Section */}
            <section className="editor-section">
                <div className="section-header" onClick={() => toggleSection('projects')}>
                    <div className="flex items-center gap-2">
                        <h3>{t('editor.projects')}</h3>
                        {activeSection === 'projects' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); addProject(); }} className="btn-icon bg-[var(--color-studio-panel)] hover:bg-[var(--color-studio-border)]">
                        <Plus size={16} />
                    </button>
                </div>

                {activeSection === 'projects' && (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEnd(e, 'projects')}
                    >
                        <SortableContext
                            items={(data.projects || []).map(p => p.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="editor-form-grid">
                                {(data.projects || []).map((project) => (
                                    <SortableItem key={project.id} id={project.id}>
                                        <div className="item-card">
                                            <div className="item-actions">
                                                <button onClick={() => removeProject(project.id)} className="text-danger">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                <input
                                                    type="text"
                                                    placeholder={t('fields.name')}
                                                    value={project.name}
                                                    onChange={(e) => handleProjectChange(project.id, 'name', e.target.value)}
                                                    className="form-input font-bold"
                                                />
                                                <div className="form-row">
                                                    <input
                                                        type="text"
                                                        placeholder={t('fields.role')}
                                                        value={project.role}
                                                        onChange={(e) => handleProjectChange(project.id, 'role', e.target.value)}
                                                        className="form-input"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder={t('fields.date')}
                                                        value={project.date}
                                                        onChange={(e) => handleProjectChange(project.id, 'date', e.target.value)}
                                                        className="form-input text-sm"
                                                    />
                                                </div>
                                                <textarea
                                                    placeholder={t('fields.description')}
                                                    rows={3}
                                                    value={project.description}
                                                    onChange={(e) => handleProjectChange(project.id, 'description', e.target.value)}
                                                    className="form-input text-sm resize-none"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Tech Stack"
                                                    value={project.techStack || ''}
                                                    onChange={(e) => handleProjectChange(project.id, 'techStack', e.target.value)}
                                                    className="form-input text-sm"
                                                />
                                            </div>
                                        </div>
                                    </SortableItem>
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </section>

            {/* Education Section */}
            <section className="editor-section">
                <div className="section-header" onClick={() => toggleSection('education')}>
                    <div className="flex items-center gap-2">
                        <h3>{t('editor.education')}</h3>
                        {activeSection === 'education' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    <button onClick={(e) => {
                        e.stopPropagation();
                        setResumeData(prev => ({
                            ...prev,
                            education: [{ id: Date.now(), school: 'Harvard University', degree: 'Computer Science', date: '2019-2023' }, ...prev.education]
                        }))
                    }} className="btn-icon bg-[var(--color-studio-panel)] hover:bg-[var(--color-studio-border)]">
                        <Plus size={16} />
                    </button>
                </div>

                {activeSection === 'education' && (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEnd(e, 'education')}
                    >
                        <SortableContext
                            items={data.education.map(edu => edu.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="editor-form-grid">
                                {data.education.map((edu) => (
                                    <SortableItem key={edu.id} id={edu.id}>
                                        <div className="item-card">
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
                                                    placeholder={t('fields.school')}
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
                                                        placeholder={t('fields.degree')}
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
                                                        placeholder={t('fields.date')}
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
                                    </SortableItem>
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </section>

            {/* Certifications Section */}
            <section className="editor-section">
                <div className="section-header" onClick={() => toggleSection('certifications')}>
                    <div className="flex items-center gap-2">
                        <h3>{t('editor.certifications')}</h3>
                        {activeSection === 'certifications' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); addCertification(); }} className="btn-icon bg-[var(--color-studio-panel)] hover:bg-[var(--color-studio-border)]">
                        <Plus size={16} />
                    </button>
                </div>

                {activeSection === 'certifications' && (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEnd(e, 'certifications')}
                    >
                        <SortableContext
                            items={(data.certifications || []).map(c => c.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="editor-form-grid">
                                {(data.certifications || []).map((cert) => (
                                    <SortableItem key={cert.id} id={cert.id}>
                                        <div className="item-card">
                                            <div className="item-actions">
                                                <button onClick={() => removeCertification(cert.id)} className="text-danger">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                <input
                                                    type="text"
                                                    placeholder={t('fields.certName')}
                                                    value={cert.name}
                                                    onChange={(e) => handleCertChange(cert.id, 'name', e.target.value)}
                                                    className="form-input font-bold"
                                                />
                                                <div className="form-row">
                                                    <input
                                                        type="text"
                                                        placeholder={t('fields.issuer')}
                                                        value={cert.issuer || ''}
                                                        onChange={(e) => handleCertChange(cert.id, 'issuer', e.target.value)}
                                                        className="form-input"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder={t('fields.date')}
                                                        value={cert.date}
                                                        onChange={(e) => handleCertChange(cert.id, 'date', e.target.value)}
                                                        className="form-input text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </SortableItem>
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </section>

            {/* Skills Section */}
            <section className="editor-section">
                <SectionHeader title={t('editor.skills')} sectionKey="skills" />
                {activeSection === 'skills' && (
                    <div className="editor-form-grid">
                        <div className="form-group">
                            <label className="form-label">{t('fields.skillName')}</label>
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
