import { useGSAP } from '@gsap/react';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { LiveMock, PhoneFrame, PlanMock, SwipeMock } from './StoryMocks';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const steps: { key: 'swipe' | 'plan' | 'live'; Mock: ComponentType<{ active: boolean }> }[] = [
  { key: 'swipe', Mock: SwipeMock },
  { key: 'plan', Mock: PlanMock },
  { key: 'live', Mock: LiveMock },
];

/**
 * Swipe → Plan → Live. On wide screens a phone stays pinned while the three
 * steps scroll past and its screen changes to match; on phones each step
 * carries its own preview.
 */
export function ScrollStory() {
  const { t } = useTranslation();
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const ActiveMock = steps[active]?.Mock ?? SwipeMock;

  useGSAP(
    () => {
      const blocks = gsap.utils.toArray<HTMLElement>('.story-step');
      blocks.forEach((block, index) => {
        ScrollTrigger.create({
          trigger: block,
          start: 'top 62%',
          end: 'bottom 62%',
          onToggle: (self) => {
            if (self.isActive) setActive(index);
          },
        });
      });

      const motionOk = gsap.matchMedia();
      motionOk.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '.story-rail-fill',
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: '.story-steps',
              start: 'top 62%',
              end: 'bottom 62%',
              scrub: 0.4,
            },
          },
        );
        blocks.forEach((block) => {
          gsap.from(block.querySelectorAll('.story-reveal'), {
            opacity: 0,
            y: 30,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.09,
            scrollTrigger: { trigger: block, start: 'top 78%' },
          });
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="story-title" className="container-page py-16 sm:py-24">
      <h2 id="story-title" className="text-sm font-semibold tracking-wide text-muted uppercase">
        {t('home.storyLabel')}
      </h2>

      <div className="mt-4 lg:grid lg:grid-cols-2 lg:gap-16">
        <div className="sticky top-24 hidden h-[calc(100dvh-8rem)] items-center justify-center lg:flex">
          <PhoneFrame>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28 }}
                className="size-full"
              >
                <ActiveMock active />
              </motion.div>
            </AnimatePresence>
          </PhoneFrame>
        </div>

        <div className="story-steps relative lg:ps-10">
          <div className="absolute start-0 top-0 hidden h-full w-0.5 rounded-full bg-line lg:block">
            <div className="story-rail-fill size-full origin-top rounded-full bg-primary" />
          </div>
          <ol>
            {steps.map(({ key, Mock }, index) => (
              <li
                key={key}
                className="story-step flex flex-col justify-center py-10 lg:min-h-[78vh] lg:py-0"
              >
                <p
                  className={cn(
                    'story-reveal font-display text-3xl transition-colors duration-300',
                    active === index ? 'text-primary-ink' : 'text-line-strong',
                  )}
                  aria-hidden="true"
                >
                  {index + 1}
                </p>
                <h3 className="story-reveal mt-3 font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
                  {t(`home.story.${key}.title`)}
                </h3>
                <p className="story-reveal mt-4 max-w-md text-lg text-muted">
                  {t(`home.story.${key}.body`)}
                </p>
                <div className="story-reveal mt-8 flex justify-center lg:hidden">
                  <PhoneFrame>
                    <Mock active={active === index} />
                  </PhoneFrame>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
