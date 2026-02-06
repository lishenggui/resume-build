import React, { forwardRef } from 'react';

const Preview = forwardRef(({ data, template = 'modern' }, ref) => {
    const { personal, experience, education, skills } = data;

    return (
        <div ref={ref} className={`resume-content resume-${template}`}>
            {/* Header */}
            <header className="resume-header">
                <div className="resume-header-content">
                    {personal.photo && (
                        <div className="resume-photo">
                            <img src={personal.photo} alt={personal.fullName} />
                        </div>
                    )}
                    <div className="resume-header-text">
                        <h1 className="resume-name">
                            {personal.fullName}
                        </h1>
                        <p className="resume-role">{personal.title}</p>

                        <div className="resume-contact">
                            {personal.email && <span>{personal.email}</span>}
                            {personal.phone && <span>• {personal.phone}</span>}
                            {personal.city && <span>• {personal.city}</span>}
                            {personal.gender && <span>• {personal.gender}</span>}
                            {personal.age && <span>• {personal.age}岁</span>}
                        </div>
                    </div>
                </div>
            </header>

            <div className="resume-body">
                {/* Main Column */}
                <div className="resume-main">
                    {/* Summary */}
                    {personal.summary && (
                        <section className="resume-section">
                            <h3 className="resume-section-title">个人简介</h3>
                            <p className="resume-text">
                                {personal.summary}
                            </p>
                        </section>
                    )}

                    {/* Experience */}
                    <section className="resume-section">
                        <h3 className="resume-section-title">工作经历</h3>
                        <div>
                            {experience.map(exp => (
                                <div key={exp.id} className="resume-item">
                                    <div className="resume-item-header">
                                        <h4 className="resume-item-title">{exp.role}</h4>
                                        <span className="resume-item-date">{exp.date}</span>
                                    </div>
                                    <div className="resume-item-subtitle">{exp.company}</div>
                                    <p className="resume-text">
                                        {exp.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Sidebar Column */}
                <div className="resume-aside">

                    {/* Education */}
                    <section className="resume-section">
                        <h3 className="resume-section-title">教育背景</h3>
                        <div>
                            {education.map(edu => (
                                <div key={edu.id} className="resume-item">
                                    <h4 className="resume-item-title">{edu.school}</h4>
                                    <div className="resume-item-subtitle">{edu.degree}</div>
                                    <div className="resume-item-date">{edu.date}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Skills */}
                    <section className="resume-section">
                        <h3 className="resume-section-title">技能专长</h3>
                        <div className="skill-tags">
                            {skills.map((skill, index) => (
                                <span key={index} className="skill-tag">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
});

Preview.displayName = 'Preview';

export default Preview;
