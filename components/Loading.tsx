

import styles from '@/components/Loading.module.css'
import { capitalize } from '@/src/util';
import React from 'react';
import _ from "lodash";

export type SpinnerVariant = "spinner" | "ripple" | "heart";

const numChildren = {
  spinner: 12,
  ripple: 2,
  heart: 1,
}

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant: SpinnerVariant;
  size?: number;
  duration?: number;
}

const defaultSize = 80;

const Spinner = ({ variant, size, duration, style }: SpinnerProps) => {

  size = size ?? defaultSize;
  const scale = Math.round(size / defaultSize * 100) / 100;
  const transform = size != defaultSize ? `scale(${scale})` : undefined
  const animationDuration = duration ? `${duration}s` : undefined

  return (
    <div style={{ width: `${size}px`, height: `${size}px`, display: "flex", justifyContent: "center", alignItems: "center", ...style }}>
      <div className={styles[`lds${capitalize(variant)}`]} style={{ transform: transform }}>
        {_.range(numChildren[variant]).map(i => <div key={i} style={{ animationDuration: animationDuration }}></div>)}
      </div>
    </div>
  )

}

export default Spinner;
