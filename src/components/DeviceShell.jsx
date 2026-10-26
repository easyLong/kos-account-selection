import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import AdminDrawer from './AdminDrawer';

export default function DeviceShell({ 
  children, 
  currentStep, 
  onBackHome,
  isAdminOpen: propIsAdminOpen,
  onOpenAdmin,
  onCloseAdmin
}) {
  const [internalAdminOpen, setInternalAdminOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [mobileUrl, setMobileUrl] = useState('');
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [viewMode, setViewMode] = useState('phone'); // 'phone' | 'fullscreen'
  const [copied, setCopied] = useState(false);

  const isAdminOpen = propIsAdminOpen !== undefined ? propIsAdminOpen : internalAdminOpen;
  const handleOpenAdmin = onOpenAdmin || (() => setInternalAdminOpen(true));
  const handleCloseAdmin = onCloseAdmin || (() => setInternalAdminOpen(false));

  useEffect(() => {
    // Check initial screen size
    const checkScreen = () => {
      setIsMobileScreen(window.innerWidth <= 768);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);

    // Auto open if ?htf or ?admin=htf or #htf in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('htf') !== null || params.get('admin') === 'htf' || params.get('admin') === '1' || window.location.hash === '#htf' || window.location.hash === '#admin') {
      handleOpenAdmin();
    }

    // Fetch system IP & generate QR code for phone scanning
    const loadSystemInfo = async () => {
      try {
        const res = await fetch('/api/system/info');
        const data = await res.json();
        const url = data?.data?.mobileUrl || window.location.href;
        setMobileUrl(url);

        const qr = await QRCode.toDataURL(url, {
          margin: 1,
          width: 220,
          color: {
            dark: '#1A1612',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(qr);
      } catch (e) {
        // Fallback
        const fallbackUrl = window.location.href;
        setMobileUrl(fallbackUrl);
        QRCode.toDataURL(fallbackUrl, { margin: 1, width: 220 }).then(setQrCodeUrl).catch(() => {});
      }
    };

    loadSystemInfo();

    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If already on mobile screen or user chose fullscreen mode
  if (isMobileScreen || viewMode === 'fullscreen') {
    return (
      <div className="mobile-native-container">
        {/* Only show fullscreen switch when on desktop in fullscreen mode */}
        {!isMobileScreen && viewMode === 'fullscreen' && (
          <div className="mobile-floating-tools">
            <button 
              className="btn-floating-switch" 
              onClick={() => setViewMode('phone')}
            >
              📱 切回手机框
            </button>
          </div>
        )}

        {/* The H5 Content */}
        {children}

        {/* Admin Drawer */}
        <AdminDrawer isOpen={isAdminOpen} onClose={handleCloseAdmin} />
      </div>
    );
  }

  // Desktop Simulator View
  return (
    <div className="desktop-layout-wrapper">
      {/* Left/Center: Phone Simulator */}
      <div className="phone-simulator-column">
        <div className="iphone-frame">
          {/* Dynamic Island / Notch */}
          <div className="iphone-dynamic-island">
            <div className="camera-lens"></div>
          </div>

          {/* WeChat In-App Top Bar */}
          <div className="wechat-header-bar">
            <div className="wx-left">
              {currentStep > 0 && onBackHome ? (
                <button className="wx-back-btn" onClick={onBackHome}>
                  ‹
                </button>
              ) : (
                <span className="wx-close-icon">✕</span>
              )}
              <span className="wx-title">KOS 账号海选</span>
            </div>
            <div className="wx-right">
              <span className="wx-more-dots">···</span>
            </div>
          </div>

          {/* Scrollable H5 Content inside Phone Screen */}
          <div className="phone-screen-scrollable">
            {children}
          </div>

          {/* iPhone Home Indicator bar */}
          <div className="iphone-home-indicator"></div>
        </div>
      </div>

      {/* Right Column: QR Code & Link Only */}
      <div className="desktop-sidebar-column">
        <div className="sidebar-card">
          <div className="sidebar-header">
            <span className="sidebar-tag">KOS 账号海选</span>
            <h3 className="sidebar-title">手机微信扫码直达</h3>
            <p className="sidebar-sub">手机微信或浏览器扫码，直接进入移动端报名</p>
          </div>

          {/* QR Code Container */}
          <div className="qr-container-box">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="手机扫码直达" className="qr-image" />
            ) : (
              <div className="qr-loading">正在生成二维码...</div>
            )}
            <div className="qr-info-row">
              <input 
                type="text" 
                readOnly 
                value={mobileUrl} 
                className="qr-url-input" 
              />
              <button className="btn-copy" onClick={handleCopy}>
                {copied ? '已复制 ✓' : '复制报名链接'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Review Drawer */}
      <AdminDrawer isOpen={isAdminOpen} onClose={handleCloseAdmin} />
    </div>
  );
}
