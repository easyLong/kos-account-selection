import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import StepProgress from './components/StepProgress';
import Step1Profile from './components/Step1Profile';
import Step2Survey from './components/Step2Survey';
import Step3Proposal from './components/Step3Proposal';
import Step4Success from './components/Step4Success';
import DeviceShell from './components/DeviceShell';

const DRAFT_STORAGE_KEY = 'kos_h5_registration_draft_v1';

const initialFormData = {
  name: '',
  gender: '男',
  department: '',
  position: '',
  jobNo: '',
  mobile: '',
  avatarUrl: '',
  workType: 'video', // 'video' | 'graphic'
  graphicImages: [], // array of { url, name, size }
  graphicContent: '',
  surveyCompleted: false,
  surveyScore: 92,
  surveyTime: '',
  videoUrl: '',
  videoName: '',
  videoSize: '',
  videoDuration: '',
  videoTitle: '',
  videoCategory: '',
  videoIntro: ''
};

export default function App() {
  const [step, setStep] = useState(0); // 0: Landing, 1: Profile, 2: Survey, 3: Proposal, 4: Success
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestSubmission, setLatestSubmission] = useState(null);
  const [isAdminOpen, setIsAdminOpen] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get('htf') !== null || p.get('admin') === 'htf' || p.get('admin') === '1' || window.location.hash === '#htf' || window.location.hash === '#admin';
    } catch (e) {
      return false;
    }
  });

  // Restore draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.warn('Failed to parse draft from localStorage', e);
    }
  }, []);

  // Auto-save draft on form change
  const handleFormChange = (updates) => {
    setFormData((prev) => {
      const nextData = { ...prev, ...updates };
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextData));
      } catch (e) {
        // quota exceeded or private mode
      }
      return nextData;
    });
  };

  const handleStart = () => {
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    setStep(prev => Math.min(prev + 1, 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    if (step === 1) {
      setStep(0);
    } else {
      setStep(prev => Math.max(prev - 1, 1));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const resData = await response.json();
      
      if (resData.code === 0) {
        setLatestSubmission(resData.data);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setStep(4); // Success step
      } else {
        alert(resData.message || '报名提交失败，请重试');
      }
    } catch (err) {
      console.error('Submission error', err);
      // Fallback offline submission simulation
      const fallbackRecord = {
        ...formData,
        id: `KOS-202610-${Math.floor(1000 + Math.random() * 9000)}`,
        status: '待初筛',
        submittedAt: new Date().toLocaleString('zh-CN', { hour12: false })
      };
      setLatestSubmission(fallbackRecord);
      setStep(4);
    } finally {
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleRestart = () => {
    setFormData(initialFormData);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setLatestSubmission(null);
    setStep(0);
  };

  return (
    <DeviceShell 
      currentStep={step} 
      onBackHome={step > 0 ? () => setStep(0) : null}
      isAdminOpen={isAdminOpen}
      onOpenAdmin={() => setIsAdminOpen(true)}
      onCloseAdmin={() => setIsAdminOpen(false)}
    >
      <div className="h5-main-wrapper">
        {/* Step 0: Landing Page matching mockup 1 */}
        {step === 0 && (
          <LandingPage 
            onStart={handleStart} 
            onOpenAdmin={() => setIsAdminOpen(true)}
          />
        )}

        {/* Steps 1, 2, 3: Stepper Header matching mockups 2, 3, 4 */}
        {step >= 1 && step <= 3 && (
          <StepProgress 
            currentStep={step} 
            onBackHome={() => setStep(0)} 
          />
        )}

        {/* Step 1: 个人介绍 */}
        {step === 1 && (
          <Step1Profile 
            formData={formData} 
            onChange={handleFormChange} 
            onNext={handleNext} 
          />
        )}

        {/* Step 2: 在线问卷 */}
        {step === 2 && (
          <Step2Survey 
            formData={formData} 
            onChange={handleFormChange} 
            onNext={handleNext} 
            onPrev={handlePrev} 
          />
        )}

        {/* Step 3: 视频提案 */}
        {step === 3 && (
          <Step3Proposal 
            formData={formData} 
            onChange={handleFormChange} 
            onSubmit={handleSubmit} 
            onPrev={handlePrev} 
            isSubmitting={isSubmitting} 
          />
        )}

        {/* Step 4: 提交成功 */}
        {step === 4 && (
          <Step4Success 
            submission={latestSubmission} 
            onRestart={handleRestart} 
          />
        )}
      </div>
    </DeviceShell>
  );
}
