import { ArrowRight } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { paths } from '@/app/paths';
import { usePageTitle } from '@/app/usePageTitle';
import { buttonStyles } from '@/components/ui/button.styles';
import { InterestTiles } from '@/features/destinations/InterestTiles';
import { TopDestinations } from '@/features/destinations/TopDestinations';
import { cn } from '@/lib/cn';
import { onIdle } from '@/lib/onIdle';
import { useNow } from '@/lib/useNow';
import { useTripDraft } from '@/store/tripDraft';
import { GlobeStage } from './GlobeStage';
import { Hero } from './Hero';

const StorySection = lazy(() => import('./StorySection'));

export function LandingPage() {
  const { t } = useTranslation();
  usePageTitle();
  const navigate = useNavigate();
  const now = useNow();
  const draft = useTripDraft();
  const sentinel = useRef<HTMLDivElement>(null);
  const [showStory, setShowStory] = useState(false);

  // The story is below the fold: fetch it once the browser is idle, or as soon
  // as someone scrolls towards it, whichever comes first.
  useEffect(() => {
    const show = () => setShowStory(true);
    const cancelIdle = onIdle(show, 2500);
    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            (entries) => entries.some((entry) => entry.isIntersecting) && show(),
            { rootMargin: '600px' },
          )
        : null;
    if (sentinel.current) observer?.observe(sentinel.current);
    return () => {
      cancelIdle();
      observer?.disconnect();
    };
  }, []);

  return (
    <>
      <Hero />
      <div className="relative z-0 container-page space-y-14 pt-14 sm:pt-16">
        <TopDestinations
          title={t('home.popularTitle')}
          now={now}
          onPick={(place) => {
            draft.setDestination(place);
            void navigate(paths.setup);
          }}
        />
        <InterestTiles
          title={t('dash.byInterest')}
          onPick={(interest) => {
            if (!draft.interests.includes(interest)) draft.toggleInterest(interest);
            void navigate(paths.setup);
          }}
        />
      </div>
      <div ref={sentinel} />
      {showStory ? (
        <Suspense fallback={<div className="min-h-[40rem]" />}>
          <StorySection />
        </Suspense>
      ) : (
        <div className="min-h-[40rem]" />
      )}
      <section className="container-page pb-20 sm:pb-28">
        <div className="grid items-center gap-6 overflow-hidden rounded-xl border border-line bg-surface px-6 py-10 shadow-sm sm:px-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <div className="text-center lg:text-start">
            <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
              {t('home.final.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-lg text-muted lg:mx-0">
              {t('home.final.body')}
            </p>
            <Link to={paths.setup} className={cn(buttonStyles({ size: 'lg' }), 'mt-8')}>
              {t('nav.plan')}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </div>
          <GlobeStage focus={draft.destination} className="mx-auto max-w-[22rem] lg:max-w-none" />
        </div>
      </section>
    </>
  );
}
