import { motion } from 'framer-motion';
import {
  Camera,
  Flower2,
  Landmark,
  Martini,
  Mountain,
  ShoppingBag,
  Trees,
  Users,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Chip } from '@/components/ui';
import { INTERESTS, type Interest } from '@/features/trip/model';

const interestIcons: Record<Interest, LucideIcon> = {
  food: Utensils,
  nature: Trees,
  history: Landmark,
  shopping: ShoppingBag,
  nightlife: Martini,
  adventure: Mountain,
  family: Users,
  religious: Flower2,
  photography: Camera,
};

type InterestPickerProps = {
  value: Interest[];
  onToggle: (interest: Interest) => void;
  label: string;
};

export function InterestPicker({ value, onToggle, label }: InterestPickerProps) {
  const { t } = useTranslation();

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2.5">
      {INTERESTS.map((interest, index) => {
        const Icon = interestIcons[interest];
        return (
          <motion.span
            key={interest}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.3 }}
          >
            <Chip
              icon={<Icon />}
              selected={value.includes(interest)}
              onSelectedChange={() => onToggle(interest)}
            >
              {t(`interests.${interest}`)}
            </Chip>
          </motion.span>
        );
      })}
    </div>
  );
}
