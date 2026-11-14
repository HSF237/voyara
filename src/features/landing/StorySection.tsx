import { useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { useEffect } from 'react';
import { ScrollStory } from './ScrollStory';

gsap.registerPlugin(ScrollTrigger);

/**
 * The scroll story plus the smooth scrolling that goes with it. GSAP,
 * ScrollTrigger and Lenis all live in this lazily loaded chunk, so none of
 * them slow down the first paint of the landing page.
 */
export default function StorySection() {
  const reduced = useReducedMotion();

  // Smooth scrolling, on the landing page only, kept in step with GSAP's scroll triggers.
  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis();
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [reduced]);

  return <ScrollStory />;
}
