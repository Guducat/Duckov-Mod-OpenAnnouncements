import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

type ThreeStep = 'step1' | 'step2' | 'cooldown' | 'step3';

export interface ThreeStepConfirmContent {
  title: string;
  message: string;
  warning: string;
  confirmText?: string;
  confirmColor?: 'primary' | 'error' | 'warning' | 'success';
}

interface ThreeStepConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onFinalConfirm: () => Promise<void> | void;
  subjectCodeLabel?: string;
  subjectCode?: string;
  cooldownMs?: number;
  cooldownMessage?: string;
  cooldownWarning?: string;
  step1: ThreeStepConfirmContent;
  step2: ThreeStepConfirmContent;
  step3: ThreeStepConfirmContent;
}

export const ThreeStepConfirmDialog: React.FC<ThreeStepConfirmDialogProps> = ({
  open,
  onClose,
  onFinalConfirm,
  subjectCodeLabel,
  subjectCode,
  cooldownMs = 5000,
  cooldownMessage = '请等待冷却时间结束后进行最终确认...',
  cooldownWarning = '这是最后一次确认机会，操作不可撤销！',
  step1,
  step2,
  step3,
}) => {
  const [step, setStep] = useState<ThreeStep>('step1');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('step1');
    setCooldownRemaining(0);
    setSubmitting(false);
  }, [open]);

  useEffect(() => {
    if (step !== 'cooldown' || cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        const next = prev - 100;
        if (next <= 0) {
          setStep('step3');
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [step, cooldownRemaining]);

  const content = useMemo((): ThreeStepConfirmContent & { buttonDisabled: boolean } => {
    if (step === 'step1') return { ...step1, confirmText: step1.confirmText ?? '确认', buttonDisabled: false };
    if (step === 'step2') return { ...step2, confirmText: step2.confirmText ?? '确认', buttonDisabled: false };
    if (step === 'cooldown') {
      return {
        title: step3.title,
        message: cooldownMessage,
        warning: cooldownWarning,
        confirmText: `等待 ${Math.ceil(cooldownRemaining / 1000)} 秒...`,
        confirmColor: step3.confirmColor ?? 'error',
        buttonDisabled: true,
      };
    }
    return { ...step3, confirmText: step3.confirmText ?? '确认', buttonDisabled: false };
  }, [step, step1, step2, step3, cooldownMessage, cooldownWarning, cooldownRemaining]);

  const handleConfirm = async () => {
    if (step === 'step1') {
      setStep('step2');
      return;
    }
    if (step === 'step2') {
      setStep('cooldown');
      setCooldownRemaining(cooldownMs);
      return;
    }
    if (step !== 'step3') return;

    setSubmitting(true);
    try {
      await onFinalConfirm();
    } finally {
      setSubmitting(false);
      onClose();
    }
  };

  const progressValue =
    step === 'cooldown' && cooldownMs > 0
      ? ((cooldownMs - cooldownRemaining) / cooldownMs) * 100
      : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        backdrop: {
          sx: { backdropFilter: 'blur(4px)' },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon color="error" />
        {content.title}
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>{content.message}</Typography>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {content.warning}
        </Alert>
        {step === 'cooldown' && (
          <LinearProgress variant="determinate" value={progressValue} color="error" />
        )}
        {subjectCodeLabel && subjectCode && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            {subjectCodeLabel}: <code>{subjectCode}</code>
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={content.confirmColor ?? 'error'}
          disabled={content.buttonDisabled || submitting}
        >
          {submitting ? '处理中...' : content.confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

