import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import '../styles/modal.css';

/**
 * 通用弹窗组件
 * @param {boolean} isOpen - 是否显示
 * @param {function} onClose - 关闭回调 (点击取消或遮罩)
 * @param {string} title - 标题
 * @param {string} message - 内容 (支持 \n 换行)
 * @param {string} type - 类型: 'info' | 'warning' | 'error' | 'success'
 * @param {function} onConfirm - 确认回调 (如果传了此函数，显示双按钮；否则只显示"我知道了")
 * @param {string} confirmText - 确认按钮文字
 * @param {string} cancelText - 取消按钮文字
 */
const Modal = ({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
    onConfirm,
    confirmText = '确定',
    cancelText = '取消'
}) => {
    if (!isOpen) return null;

    // 阻止背景滚动
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // 根据类型选择图标和样式类
    const getConfig = () => {
        switch (type) {
            case 'warning':
                return { icon: <AlertTriangle size={24} />, className: 'modal-warning', iconClass: 'icon-warning' };
            case 'error':
                return { icon: <AlertCircle size={24} />, className: 'modal-error', iconClass: 'icon-error' };
            case 'success':
                return { icon: <CheckCircle size={24} />, className: 'modal-info', iconClass: 'icon-info' }; // 使用 info 的蓝色调
            default:
                return { icon: <Info size={24} />, className: 'modal-info', iconClass: 'icon-info' };
        }
    };

    const config = getConfig();

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return createPortal(
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className={`modal-container ${config.className}`}>
                {/* Header */}
                <div className="modal-header">
                    <div className={`modal-title`}>
                        <span className={config.iconClass}>{config.icon}</span>
                        {title}
                    </div>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="modal-content">
                    {message}
                </div>

                {/* Footer Actions */}
                <div className="modal-footer">
                    {onConfirm ? (
                        <>
                            <button className="btn btn-secondary" onClick={onClose}>
                                {cancelText}
                            </button>
                            <button
                                className={`btn ${type === 'error' ? 'btn-primary' : 'btn-primary'}`}
                                style={type === 'warning' ? { background: '#d97706' } : {}}
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                            >
                                {confirmText}
                            </button>
                        </>
                    ) : (
                        <button className="btn btn-primary" onClick={onClose}>
                            {confirmText || '我知道了'}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default Modal;
