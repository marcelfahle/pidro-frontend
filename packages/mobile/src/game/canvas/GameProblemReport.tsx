import { useEffect, useRef, useState } from 'react';
import { BevelButton } from '@/components/ui/BevelButton';
import { PidroText } from '@/components/ui/PidroText';
import { useTranslation } from '@/i18n';
import {
  captureGameReport,
  sendGameReport,
  type CapturedGameReport,
  ReportSendError,
} from '@/diagnostics/report';
import { TableUtilityWindow } from './TableUtilityWindow';

export type GameReportActions = {
  capture: () => CapturedGameReport | null;
  send: (capture: CapturedGameReport) => Promise<string>;
};

/** Keep mounted so the in-flight lock and server cooldown survive dismissal. */
export function GameProblemReport({
  open,
  onClose,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  actions?: GameReportActions;
}) {
  const { t } = useTranslation();
  const capture = useRef<CapturedGameReport | null>(null);
  const sending = useRef(false);
  const [status, setStatus] = useState<'confirm' | 'sending' | 'success' | 'error'>('confirm');
  const [available, setAvailable] = useState(false);
  const [reportId, setReportId] = useState('');
  const [kind, setKind] = useState<ReportSendError['kind']>('failed');
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!open || sending.current) return;
    capture.current = (actions?.capture ?? captureGameReport)();
    setAvailable(capture.current !== null);
    setStatus('confirm');
    setNow(Date.now());
  }, [open, actions]);
  useEffect(() => {
    if (!open || now >= retryAt) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(1000, retryAt - now));
    return () => clearTimeout(timer);
  }, [open, now, retryAt]);
  const seconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const terminal =
    status === 'error' && ['unsupported', 'forbidden', 'identity_changed'].includes(kind);
  const send = async () => {
    if (
      sending.current ||
      !capture.current ||
      Date.now() < retryAt ||
      terminal ||
      status === 'success'
    )
      return;
    sending.current = true;
    setStatus('sending');
    try {
      const id = await (actions?.send ?? sendGameReport)(capture.current);
      setReportId(id);
      setStatus('success');
    } catch (error) {
      const failure = error instanceof ReportSendError ? error.kind : 'failed';
      setKind(failure);
      if (error instanceof ReportSendError && failure === 'rate_limited') {
        setNow(Date.now());
        setRetryAt(Date.now() + Math.max(0, error.retryAfterSeconds ?? 0) * 1000);
      }
      setStatus('error');
    } finally {
      sending.current = false;
    }
  };
  const close = () => {
    if (!sending.current) onClose();
  };
  return (
    <TableUtilityWindow title={t('game.report_title')} open={open} onClose={close}>
      {!available ? (
        <PidroText>{t('game.report_unsupported')}</PidroText>
      ) : status === 'success' ? (
        <>
          <PidroText accessibilityLiveRegion="polite">{t('game.report_success')}</PidroText>
          <PidroText role="label">{t('game.report_id')}</PidroText>
          <PidroText selectable testID="game-report-id">
            {reportId}
          </PidroText>
        </>
      ) : (
        <>
          {status !== 'error' && <PidroText>{t('game.report_confirm')}</PidroText>}
          <PidroText role="metadata" tone="soft">
            {t('game.report_privacy')}
          </PidroText>
          {status === 'error' && (
            <PidroText tone="danger" accessibilityLiveRegion="polite">
              {t(`game.report_${kind}`)}
            </PidroText>
          )}
          {status === 'sending' && (
            <PidroText accessibilityLiveRegion="polite">{t('game.report_sending')}</PidroText>
          )}
          {seconds > 0 && <PidroText>{t('game.report_countdown', { seconds })}</PidroText>}
          {!terminal && (
            <BevelButton
              label={t(status === 'error' ? 'game.report_retry' : 'game.report_send')}
              fullWidth
              loading={status === 'sending'}
              disabled={seconds > 0}
              onPress={send}
            />
          )}
        </>
      )}
      <BevelButton
        material="glass"
        fullWidth
        label={t(status === 'success' ? 'game.report_done' : 'game.report_cancel')}
        disabled={status === 'sending'}
        onPress={close}
      />
    </TableUtilityWindow>
  );
}
