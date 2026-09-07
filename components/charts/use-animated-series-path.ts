"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LINE_LOADING_PULSE_EASE } from "./line-loading-timing";
import {
  computeSeriesPathPoints,
  interpolateSeriesPathPoints,
  type SeriesPathPoint,
  seriesPathFromPoints,
  seriesPathTransitionSignature,
} from "./series-path-utils";

// biome-ignore lint/suspicious/noExplicitAny: d3 curve factory type
type CurveFactory = any;

export interface UseAnimatedSeriesPathOptions {
  renderData: Record<string, unknown>[];
  xAccessor: (datum: Record<string, unknown>) => Date;
  xScale: (value: Date) => number | undefined;
  yScale: (value: number) => number | undefined;
  dataKey: string;
  curve: CurveFactory;
  chartPhase: string;
  durationMs: number;
  innerWidth: number;
  enabled: boolean;
}

export function useAnimatedSeriesPath({
  renderData,
  xAccessor,
  xScale,
  yScale,
  dataKey,
  curve,
  chartPhase,
  durationMs,
  innerWidth,
  enabled,
}: UseAnimatedSeriesPathOptions) {
  const reducedMotion = useReducedMotion();
  const [animatedPoints, setAnimatedPoints] = useState<
    SeriesPathPoint[] | null
  >(null);
  const displayedPointsRef = useRef<SeriesPathPoint[] | null>(null);
  const animatingRef = useRef(false);

  const xScaleDomain = useMemo(() => {
    const scaleWithDomain = xScale as { domain?: () => [Date, Date] };
    return scaleWithDomain.domain?.() ?? [new Date(0), new Date(0)];
  }, [xScale]);

  const transitionSignature = useMemo(
    () =>
      seriesPathTransitionSignature({
        renderData,
        xAccessor,
        dataKey,
        innerWidth,
        xDomainMin: xScaleDomain[0]?.getTime?.() ?? 0,
        xDomainMax: xScaleDomain[1]?.getTime?.() ?? 0,
      }),
    [renderData, xAccessor, dataKey, innerWidth, xScaleDomain]
  );

  const targetPoints = useMemo(
    () =>
      computeSeriesPathPoints(renderData, xAccessor, xScale, yScale, dataKey),
    [renderData, xAccessor, xScale, yScale, dataKey]
  );

  // Latest inputs for use inside the animation loop below. The y-scale (and
  // therefore `targetPoints`) can change identity on every frame of a
  // concurrent y-domain tween (e.g. switching series changes both the line's
  // dataKey and the axis max at once) — that must not be a dependency of the
  // effect that starts/stops the path tween, or every y-domain tick would
  // cancel the in-flight transition and freeze the line mid-draw.
  const latestRef = useRef({ renderData, xAccessor, xScale, yScale, dataKey });
  latestRef.current = { renderData, xAccessor, xScale, yScale, dataKey };

  const prevTransitionSignatureRef = useRef(transitionSignature);

  useEffect(() => {
    if (!animatingRef.current) {
      displayedPointsRef.current = targetPoints;
    }
  }, [targetPoints]);

  useEffect(() => {
    const shouldAnimate =
      enabled &&
      !reducedMotion &&
      chartPhase === "ready" &&
      durationMs > 0 &&
      latestRef.current.renderData.length > 0;

    if (!shouldAnimate) {
      animatingRef.current = false;
      setAnimatedPoints(null);
      displayedPointsRef.current = computeSeriesPathPoints(
        latestRef.current.renderData,
        latestRef.current.xAccessor,
        latestRef.current.xScale,
        latestRef.current.yScale,
        latestRef.current.dataKey
      );
      prevTransitionSignatureRef.current = transitionSignature;
      return;
    }

    if (prevTransitionSignatureRef.current === transitionSignature) {
      return;
    }
    prevTransitionSignatureRef.current = transitionSignature;

    const fromPoints =
      displayedPointsRef.current ??
      computeSeriesPathPoints(
        latestRef.current.renderData,
        latestRef.current.xAccessor,
        latestRef.current.xScale,
        latestRef.current.yScale,
        latestRef.current.dataKey
      );
    if (fromPoints.length === 0) {
      displayedPointsRef.current = fromPoints;
      return;
    }

    animatingRef.current = true;
    const fromSnapshot = fromPoints;

    const control = animate(0, 1, {
      duration: durationMs / 1000,
      ease: [...LINE_LOADING_PULSE_EASE],
      onUpdate: (progress) => {
        const {
          renderData: latestRenderData,
          xAccessor: latestXAccessor,
          xScale: latestXScale,
          yScale: latestYScale,
          dataKey: latestDataKey,
        } = latestRef.current;
        const currentTarget = computeSeriesPathPoints(
          latestRenderData,
          latestXAccessor,
          latestXScale,
          latestYScale,
          latestDataKey
        );
        const next = interpolateSeriesPathPoints(
          fromSnapshot,
          currentTarget,
          progress
        );
        displayedPointsRef.current = next;
        setAnimatedPoints(next);
      },
      onComplete: () => {
        animatingRef.current = false;
        displayedPointsRef.current = computeSeriesPathPoints(
          latestRef.current.renderData,
          latestRef.current.xAccessor,
          latestRef.current.xScale,
          latestRef.current.yScale,
          latestRef.current.dataKey
        );
        setAnimatedPoints(null);
      },
    });

    return () => {
      control.stop();
      animatingRef.current = false;
    };
  }, [transitionSignature, chartPhase, durationMs, enabled, reducedMotion]);

  const activePoints = animatedPoints ?? targetPoints;
  const pathD = useMemo(
    () => seriesPathFromPoints(activePoints, curve),
    [activePoints, curve]
  );

  return {
    pathD,
    isPathAnimating: animatedPoints != null,
  };
}
