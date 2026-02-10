import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBreakpoints } from '../hooks';
import { useTour } from '../hooks/useTour';
import { matchTourRoute } from '../utils/tourSteps';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const TourOverlay: React.FC = () => {
  const { isMobile } = useBreakpoints();
  const location = useLocation();
  const navigate = useNavigate();
  const { isActive, steps, stepIndex, stop, goTo, restart, mode } = useTour();

  const step = steps[stepIndex];
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetEl, setTargetEl] = useState<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 320, height: 200 });
  const lastTargetRef = useRef<HTMLElement | null>(null);
  const [waitingForTarget, setWaitingForTarget] = useState(false);
  const [fallbackEnabled, setFallbackEnabled] = useState(false);

  const routeMatches = useMemo(() => {
    if (!step) return true;
    return matchTourRoute(location.pathname, step.route);
  }, [location.pathname, step]);

  const allowTooltip = useMemo(() => {
    if (!step) return true;
    if (!step.route || step.route === '*') return true;
    if (routeMatches) return true;
    return step.route.includes(':');
  }, [routeMatches, step]);

  useEffect(() => {
    if (!isActive || !step) return;
    if (!routeMatches && step.route && !step.route.includes(':') && step.autoNavigate !== false) {
      navigate(step.route);
    }
  }, [isActive, navigate, routeMatches, step]);

  useEffect(() => {
    if (!isActive || !step) {
      setWaitingForTarget(false);
      setFallbackEnabled(false);
      return;
    }
    if (!step.selector) {
      setWaitingForTarget(false);
      setFallbackEnabled(true);
      return;
    }
    if (!allowTooltip) {
      setWaitingForTarget(true);
      setFallbackEnabled(false);
      return;
    }
    setWaitingForTarget(true);
    setFallbackEnabled(false);
    const timer = window.setTimeout(() => {
      setFallbackEnabled(true);
    }, 550);
    return () => window.clearTimeout(timer);
  }, [allowTooltip, isActive, step]);

  useEffect(() => {
    if (!isActive || !step) return;
    let frameId: number | null = null;

    const updateTarget = () => {
      if (!isActive || !step) return;
      const el = step.selector ? (document.querySelector(step.selector) as HTMLElement | null) : null;
      setTargetEl(el);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);

        if (lastTargetRef.current !== el) {
          lastTargetRef.current = el;
          const outOfView = rect.top < 0 || rect.bottom > window.innerHeight;
          if (outOfView) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      } else {
        setTargetRect(null);
      }
    };

    updateTarget();
    const intervalId = window.setInterval(updateTarget, 500);

    const handleScroll = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateTarget);
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updateTarget);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updateTarget);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [isActive, step]);

  useEffect(() => {
    if (targetEl) {
      setWaitingForTarget(false);
    }
  }, [targetEl]);

  useLayoutEffect(() => {
    if (!tooltipRef.current) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    setTooltipSize({ width: rect.width, height: rect.height });
  }, [step, isMobile, targetRect]);

  if (!isActive || !step) return null;
  if (!allowTooltip && step.route && !step.route.includes(':')) {
    return null;
  }

  const highlightPadding = step.highlightPadding ?? 8;
  const hasTarget = Boolean(targetRect);
  const showTooltip = allowTooltip && (!waitingForTarget || fallbackEnabled);
  const mobilePlacement = step.mobilePlacement || 'bottom';

  const highlightStyle = hasTarget && targetRect
    ? {
        top: targetRect.top - highlightPadding,
        left: targetRect.left - highlightPadding,
        width: targetRect.width + highlightPadding * 2,
        height: targetRect.height + highlightPadding * 2,
      }
    : null;

  const tooltipStyle = (() => {
    if (isMobile) return {};
    if (!hasTarget || !targetRect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const spacing = 12;
    const placement = step.placement || 'bottom';
    let top = targetRect.bottom + spacing;
    let left = targetRect.left;

    if (placement === 'top') {
      top = targetRect.top - tooltipSize.height - spacing;
      left = targetRect.left;
    } else if (placement === 'left') {
      top = targetRect.top;
      left = targetRect.left - tooltipSize.width - spacing;
    } else if (placement === 'right') {
      top = targetRect.top;
      left = targetRect.right + spacing;
    } else if (placement === 'center') {
      top = targetRect.top + targetRect.height / 2 - tooltipSize.height / 2;
      left = targetRect.left + targetRect.width / 2 - tooltipSize.width / 2;
    }

    const maxLeft = window.innerWidth - tooltipSize.width - 16;
    const maxTop = window.innerHeight - tooltipSize.height - 16;
    return {
      top: clamp(top, 16, Math.max(maxTop, 16)),
      left: clamp(left, 16, Math.max(maxLeft, 16)),
    };
  })();

  const handleNext = () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= steps.length) {
      stop('completed');
      return;
    }

    const nextStep = steps[nextIndex];
    if (nextStep?.route && !matchTourRoute(location.pathname, nextStep.route)) {
      if (!nextStep.route.includes(':')) {
        navigate(nextStep.route);
      } else if (targetEl) {
        const routeFromTarget =
          targetEl.getAttribute('data-tour-route') ||
          (targetEl instanceof HTMLAnchorElement ? targetEl.getAttribute('href') : null);
        if (routeFromTarget) {
          navigate(routeFromTarget);
        }
      }
    }

    goTo(nextIndex);
  };

  const handlePrev = () => {
    if (stepIndex === 0) return;
    const prevIndex = stepIndex - 1;
    const prevStep = steps[prevIndex];
    if (prevStep?.route && !matchTourRoute(location.pathname, prevStep.route)) {
      if (!prevStep.route.includes(':')) {
        navigate(prevStep.route);
      }
    }
    goTo(prevIndex);
  };

  const actionLabel = stepIndex === steps.length - 1 ? 'Finalizar' : 'Siguiente';
  const subtitle =
    !routeMatches && step.route?.includes(':')
      ? 'Abre un proyecto para continuar con este paso.'
      : !hasTarget
        ? 'No encontramos este elemento en pantalla. Puedes continuar.'
        : null;

  const overlayClass = highlightStyle ? 'bg-black/15' : 'bg-black/30';

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className={`absolute inset-0 transition-opacity duration-200 ${overlayClass}`} />

      {highlightStyle && (
        <div
          className="absolute rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.22)] pointer-events-none transition-all duration-200"
          style={highlightStyle}
        />
      )}

      {showTooltip && isMobile ? (
        <div
          className={`absolute inset-x-0 p-4 ${
            mobilePlacement === 'top'
              ? 'top-4'
              : mobilePlacement === 'center'
                ? 'top-1/2 -translate-y-1/2'
                : 'bottom-0'
          }`}
        >
          <div ref={tooltipRef} className="bg-white rounded-2xl shadow-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Paso {stepIndex + 1} de {steps.length}
                </p>
                <h3 className="text-lg font-bold text-dark-blue">{step.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => stop('dismissed')}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Cerrar guía"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 mt-2">{step.body}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}

            <div className="flex items-center justify-between gap-2 mt-4">
              <button
                type="button"
                onClick={handlePrev}
                disabled={stepIndex === 0}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 disabled:opacity-50"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded-lg bg-primary-blue text-white text-sm font-semibold"
              >
                {actionLabel}
              </button>
            </div>

            <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
              <button type="button" onClick={() => stop('dismissed')} className="hover:text-gray-700">
                Saltar
              </button>
              {mode === 'onboarding' && (
                <button type="button" onClick={() => stop('skipped')} className="hover:text-gray-700">
                  No volver a mostrar
                </button>
              )}
              <button type="button" onClick={restart} className="hover:text-gray-700">
                Reiniciar guía
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showTooltip && !isMobile ? (
        <div
          ref={tooltipRef}
          className="fixed max-w-sm bg-white rounded-2xl shadow-2xl p-5"
          style={tooltipStyle as React.CSSProperties}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Paso {stepIndex + 1} de {steps.length}
              </p>
              <h3 className="text-lg font-bold text-dark-blue">{step.title}</h3>
            </div>
            <button
              type="button"
              onClick={() => stop('dismissed')}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Cerrar guía"
            >
              ✕
            </button>
          </div>

          <p className="text-sm text-gray-600 mt-2">{step.body}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}

          <div className="flex items-center justify-between gap-2 mt-4">
            <button
              type="button"
              onClick={handlePrev}
              disabled={stepIndex === 0}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 disabled:opacity-50"
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 rounded-lg bg-primary-blue text-white text-sm font-semibold"
            >
              {actionLabel}
            </button>
          </div>

          <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
            <button type="button" onClick={() => stop('dismissed')} className="hover:text-gray-700">
              Saltar
            </button>
            {mode === 'onboarding' && (
              <button type="button" onClick={() => stop('skipped')} className="hover:text-gray-700">
                No volver a mostrar
              </button>
            )}
            <button type="button" onClick={restart} className="hover:text-gray-700">
              Reiniciar guía
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TourOverlay;
