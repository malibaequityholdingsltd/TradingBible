import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  motion, useInView, useReducedMotion, useScroll, useSpring, useTransform,
} from 'framer-motion';
import '@/styles/public-motion.css';

export const LAUNCH_DATE = new Date('2026-12-25T00:00:00Z');
export const LAUNCH_LABEL = '25 December 2026';

function useCountdown(target = LAUNCH_DATE) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  const totalSeconds = Math.floor(diff / 1000);
  return {
    launched: diff <= 0,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/* Scroll-triggered reveal. The content is always present in the DOM, so the
 * public pages remain readable without JavaScript and never hide copy behind
 * an animation that might fail. */
export function Reveal({
  children, className = '', delay = 0, y = 26, once = true, as = 'div',
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once, margin: '-10% 0px -10% 0px' }}
      transition={{ duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Tag>
  );
}

export function Stagger({ children, className = '', delay = 0, once = true }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : 'hidden'}
      whileInView={reduce ? undefined : 'show'}
      viewport={{ once, margin: '-8% 0px -8% 0px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.085, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 22 },
        show: { opacity: 1, y: 0, transition: { duration: 0.62, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function Parallax({ children, className = '', distance = 28 }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  return (
    <motion.div ref={ref} className={className} style={reduce ? undefined : { y }}>
      {children}
    </motion.div>
  );
}

export function CountUp({
  value, prefix = '', suffix = '', decimals = 0, className = '', duration = 1200,
}) {
  const target = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, '')) || 0;
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-8% 0px' });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!inView) return undefined;
    if (reduce) {
      setDisplay(target);
      return undefined;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(target * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, target, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

export function Marquee({
  items, className = '', speed = 34, reverse = false, separator = '✦',
}) {
  const duration = `${Math.max(16, speed)}s`;
  return (
    <div className={`pm-marquee ${className}`} aria-label={typeof items[0] === 'string' ? items.join(' · ') : undefined}>
      <div
        className="pm-marquee__track"
        style={{ '--pm-marquee-duration': duration, animationDirection: reverse ? 'reverse' : 'normal' }}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="pm-marquee__set" aria-hidden={copy === 1 ? 'true' : undefined}>
            {items.map((item, index) => (
              <React.Fragment key={`${copy}-${index}-${typeof item === 'string' ? item : 'node'}`}>
                <span className="pm-marquee__item">{item}</span>
                <span className="pm-marquee__sep" aria-hidden>{separator}</span>
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TiltCard({ children, className = '', max = 5, ...rest }) {
  const reduce = useReducedMotion();
  const [style, setStyle] = useState({});
  const onMove = (event) => {
    if (reduce) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    setStyle({
      transform: `perspective(950px) rotateX(${(0.5 - py) * max * 2}deg) rotateY(${(px - 0.5) * max * 2}deg) translateY(-2px)`,
    });
  };
  const onLeave = () => setStyle({ transform: 'perspective(950px) rotateX(0deg) rotateY(0deg) translateY(0)' });
  return (
    <div
      {...rest}
      className={`pm-tilt ${className}`}
      style={{ ...style, transition: reduce ? undefined : 'transform 180ms ease-out' }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  );
}

export function SpotlightCard({ children, className = '', ...rest }) {
  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--pm-x', `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty('--pm-y', `${event.clientY - rect.top}px`);
  };
  return (
    <section {...rest} className={`pm-spotlight ${className}`} onMouseMove={onMove}>
      {children}
    </section>
  );
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.25 });
  return <motion.div aria-hidden className="pm-scroll-progress" style={{ scaleX }} />;
}

export function LaunchCountdown({ compact = false, className = '' }) {
  const { launched, days, hours, minutes, seconds } = useCountdown();
  if (compact) {
    return (
      <span className={`pm-countdown-compact ${className}`} role="timer" aria-label={`Official launch countdown: ${days} days`}>
        <span className="pm-live-dot" /> Official launch · {LAUNCH_LABEL} · {launched ? 'launched' : `${days}d ${hours}h ${minutes}m`}
      </span>
    );
  }
  const units = [
    ['Days', days],
    ['Hours', hours],
    ['Minutes', minutes],
    ['Seconds', seconds],
  ];
  return (
    <div className={`pm-countdown ${className}`} role="timer" aria-label="Official launch countdown">
      {units.map(([label, value]) => (
        <div className="pm-countdown__unit" key={label}>
          <span>{launched ? '00' : String(value).padStart(2, '0')}</span>
          <em>{label}</em>
        </div>
      ))}
    </div>
  );
}

export function LaunchPill({ className = '' }) {
  return (
    <Link to="/launch" className={`pm-launch-pill ${className}`}>
      <span className="pm-live-dot" />
      <span>Official launch · {LAUNCH_LABEL}</span>
      <span className="pm-launch-pill__arrow" aria-hidden>↗</span>
    </Link>
  );
}

const STARS = Array.from({ length: 30 }, (_, index) => ({
  left: `${(index * 37 + 11) % 100}%`,
  top: `${(index * 53 + 7) % 100}%`,
  delay: `${(index % 9) * 0.42}s`,
  size: index % 8 === 0 ? 3 : 2,
}));

export function SignalField({ variant = 'home', className = '' }) {
  return (
    <div aria-hidden className={`pm-field pm-field--${variant} ${className}`}>
      <div className="pm-field__grid" />
      <div className="pm-field__orb pm-field__orb--a" />
      <div className="pm-field__orb pm-field__orb--b" />
      <div className="pm-field__ring pm-field__ring--a" />
      <div className="pm-field__ring pm-field__ring--b" />
      {STARS.map((star, index) => (
        <span
          key={index}
          className="pm-field__star"
          style={{ left: star.left, top: star.top, animationDelay: star.delay, width: star.size, height: star.size }}
        />
      ))}
      <div className="pm-field__beam" />
    </div>
  );
}

export function PageBackdrop({ variant = 'home', className = '' }) {
  return (
    <div className={`pm-backdrop pm-backdrop--${variant} ${className}`} aria-hidden>
      <SignalField variant={variant} />
      <div className="pm-backdrop__fade" />
    </div>
  );
}

export function SectionRail({ index, label, className = '' }) {
  return (
    <div className={`pm-section-rail ${className}`}>
      <span>{index}</span>
      <i aria-hidden />
      <em>{label}</em>
    </div>
  );
}

export function ScrollCue({ href = '#next', label = 'Scroll to explore' }) {
  return (
    <a href={href} className="pm-scroll-cue">
      <span>{label}</span>
      <span aria-hidden className="pm-scroll-cue__line"><i /></span>
    </a>
  );
}
