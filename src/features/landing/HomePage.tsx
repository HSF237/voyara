import { motion, type Variants } from 'framer-motion';
import { ArrowRight, CalendarRange, CircleCheckBig, Heart, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { paths } from '@/app/paths';
import { usePageTitle } from '@/app/usePageTitle';
import { Badge, buttonStyles, Card, CardText, CardTitle } from '@/components/ui';

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const steps: { key: 'one' | 'two' | 'three'; icon: LucideIcon }[] = [
  { key: 'one', icon: CalendarRange },
  { key: 'two', icon: Heart },
  { key: 'three', icon: CircleCheckBig },
];

/**
 * Home. Milestone 2 replaces the hero with the 3D globe and destination
 * search; the copy and the three-step story stay.
 */
export function HomePage() {
  const { t } = useTranslation();
  usePageTitle();

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <section className="container-page pt-14 pb-12 sm:pt-24 sm:pb-20">
        <motion.div variants={rise}>
          <Badge tone="success">{t('home.eyebrow')}</Badge>
        </motion.div>
        <motion.h1
          variants={rise}
          className="mt-6 max-w-4xl font-display text-2xl font-normal tracking-tight text-ink sm:text-3xl lg:text-4xl"
        >
          {t('home.titleLead')} <em className="text-primary-ink">{t('home.titleEmphasis')}</em>
        </motion.h1>
        <motion.p variants={rise} className="mt-6 max-w-xl text-lg text-muted">
          {t('home.body')}
        </motion.p>
        <motion.div variants={rise} className="mt-9 flex flex-wrap gap-3">
          <Link to={paths.design} className={buttonStyles({ size: 'lg' })}>
            {t('home.ctaDesign')}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
          <Link to={paths.settings} className={buttonStyles({ variant: 'secondary', size: 'lg' })}>
            {t('home.ctaSettings')}
          </Link>
        </motion.div>
      </section>

      <section aria-labelledby="how-it-works" className="container-page pb-20 sm:pb-28">
        <motion.h2
          variants={rise}
          id="how-it-works"
          className="text-sm font-semibold tracking-wide text-muted uppercase"
        >
          {t('home.stepsLabel')}
        </motion.h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {steps.map(({ key, icon: Icon }, index) => (
            <motion.li key={key} variants={rise}>
              <Card className="h-full">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-display text-2xl text-line-strong/60" aria-hidden="true">
                    {index + 1}
                  </span>
                </div>
                <CardTitle className="mt-5">{t(`home.steps.${key}.title`)}</CardTitle>
                <CardText>{t(`home.steps.${key}.body`)}</CardText>
              </Card>
            </motion.li>
          ))}
        </ol>
      </section>
    </motion.div>
  );
}
